"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { getUserById } from "@/data";
import { departments } from "@/data/departments";
import { auditEntry, diffFields } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { readDb, updateDb } from "@/lib/db";
import {
  defaultNextReviewDate,
  DOCUMENT_TYPES,
  downloadFileName,
  downloadQuota,
  inferDocumentType,
  isVisibleToEmployee,
  latestVersion,
  MAX_DOWNLOAD_LIMIT,
  pendingDraft,
  publishedVersion,
} from "@/lib/documents";
import type { DocumentType } from "@/lib/types";
import type { FieldError } from "@/lib/standards/actions";

export type DocFieldError = FieldError | "outOfRange";
export type DocError = "forbidden" | "notFound" | "invalidState" | "limitReached";
export type DocResult = { ok: true } | { ok: false; error?: DocError; fieldErrors?: Record<string, DocFieldError> };

const fail = (error: DocError): DocResult => ({ ok: false, error });
const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

async function requireAdmin() {
  const user = await getSessionUser();
  return user?.role === "admin" || user?.role === "qe" ? user : undefined;
}

/** Whole number 0–MAX, or an error code. */
function parseLimit(raw: unknown): number | DocFieldError {
  const s = clean(typeof raw === "number" ? String(raw) : raw);
  if (s === "") return "required";
  const n = Number(s);
  if (!Number.isInteger(n)) return "invalidNumber";
  if (n < 0 || n > MAX_DOWNLOAD_LIMIT) return "outOfRange";
  return n;
}

/* ---------------- Create / edit ---------------- */

export type DocumentInput = {
  code: string;
  docType?: string;
  clause?: string;
  nextReviewDate?: string;
  title: string;
  description: string;
  standardId: string;
  departmentId: string;
  ownerId: string;
  downloadLimit: string;
  changeNote: string; // new document: note of v1 · edit: note of the pending draft (if any)
};

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Create (id undefined → version 1 as draft) or edit document details. Admin only. */
export async function saveDocument(id: string | undefined, input: DocumentInput): Promise<DocResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const existing = id ? db.documents.find((d) => d.id === id) : undefined;
  if (id && !existing) return fail("notFound");
  if (existing?.cancelled) return fail("invalidState");

  const code = clean(input.code).toUpperCase();
  const rawType = clean(input.docType).toUpperCase();
  const docType: DocumentType = DOCUMENT_TYPES.includes(rawType as DocumentType)
    ? (rawType as DocumentType)
    : inferDocumentType(code);
  const clause = clean(input.clause);
  const nextReviewDate = clean(input.nextReviewDate);

  const data = {
    code,
    docType,
    clause: clause || undefined,
    nextReviewDate: nextReviewDate || undefined,
    title: clean(input.title),
    description: clean(input.description),
    standardId: clean(input.standardId),
    departmentId: clean(input.departmentId),
    ownerId: clean(input.ownerId),
  };
  const changeNote = clean(input.changeNote);
  const limit = parseLimit(input.downloadLimit);

  const fieldErrors: Record<string, DocFieldError> = {};
  if (!data.code) fieldErrors.code = "required";
  else if (db.documents.some((d) => d.id !== id && d.code === data.code)) fieldErrors.code = "duplicate";
  if (!data.title) fieldErrors.title = "required";
  if (!db.standards.some((s) => s.id === data.standardId)) fieldErrors.standardId = "required";
  if (!departments.some((d) => d.id === data.departmentId)) fieldErrors.departmentId = "required";
  if (!getUserById(data.ownerId)) fieldErrors.ownerId = "required";
  if (nextReviewDate && !isValidIsoDate(nextReviewDate)) fieldErrors.nextReviewDate = "invalidDate";
  if (typeof limit !== "number") fieldErrors.downloadLimit = limit;
  if (!id && !changeNote) fieldErrors.changeNote = "required";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const now = new Date().toISOString();
  await updateDb((db) => {
    const after = { ...data, downloadLimit: limit as number };
    const fields = [
      "code",
      "docType",
      "clause",
      "nextReviewDate",
      "title",
      "description",
      "standardId",
      "departmentId",
      "ownerId",
      "downloadLimit",
    ] as const;
    const entity = { type: "document" as const, label: data.code };
    if (existing) {
      const doc = db.documents.find((d) => d.id === id)!;
      const changes = diffFields(doc, after, [...fields]);
      Object.assign(doc, after);
      const draft = pendingDraft(doc);
      if (draft && changeNote && draft.changeNote !== changeNote) {
        changes.push({ field: "changeNote", from: draft.changeNote, to: changeNote });
        draft.changeNote = changeNote;
      }
      db.auditLog.push(auditEntry(user, "update", { ...entity, id: doc.id }, { changes }));
    } else {
      const newId = randomUUID();
      db.auditLog.push(
        auditEntry(user, "create", { ...entity, id: newId }, {
          changes: [...diffFields(undefined, after, [...fields]), { field: "version", from: "", to: "1 (draft)" }],
        }),
      );
      db.documents.push({
        id: newId,
        ...data,
        versions: [{ version: 1, changeNote, status: "draft", createdAt: now, createdBy: user.id }],
        downloadLimit: limit as number,
        userLimits: {},
        downloadsUsed: {},
        downloadLog: [],
      });
    }
  });
  refresh();
  return { ok: true };
}

/* ---------------- Version lifecycle ---------------- */

/** Start a new draft version. Allowed only when there is no pending draft. Admin only. */
export async function createVersion(id: string, changeNoteRaw: string): Promise<DocResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return fail("notFound");
  if (doc.cancelled || pendingDraft(doc)) return fail("invalidState");
  const changeNote = clean(changeNoteRaw);
  if (!changeNote) return { ok: false, fieldErrors: { changeNote: "required" } };

  await updateDb((db) => {
    const d = db.documents.find((d) => d.id === id)!;
    const version = latestVersion(d).version + 1;
    d.versions.push({
      version,
      changeNote,
      status: "draft",
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    });
    db.auditLog.push(
      auditEntry(user, "new_version", { type: "document", id, label: d.code }, {
        changes: [{ field: "version", from: "", to: `${version} (draft)` }],
        note: changeNote,
      }),
    );
  });
  refresh();
  return { ok: true };
}

/** Publish the pending draft; the previous published version becomes superseded. Admin only. */
export async function publishDocument(id: string): Promise<DocResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return fail("notFound");
  if (doc.cancelled || !pendingDraft(doc)) return fail("invalidState");

  await updateDb((db) => {
    const d = db.documents.find((d) => d.id === id)!;
    const previous = publishedVersion(d);
    if (previous) previous.status = "superseded";
    const draft = pendingDraft(d)!;
    const now = new Date().toISOString();
    draft.status = "published";
    draft.publishedAt = now;
    draft.publishedBy = user.id;
    if (!d.nextReviewDate) d.nextReviewDate = defaultNextReviewDate(now);
    db.auditLog.push(
      auditEntry(user, "publish", { type: "document", id, label: d.code }, {
        changes: [{ field: "publishedVersion", from: previous ? String(previous.version) : "", to: String(draft.version) }],
      }),
    );
  });
  refresh();
  return { ok: true };
}

/** Discard a pending v2+ draft revision while preserving published/superseded versions. Admin / QE only. */
export async function discardDraft(id: string): Promise<DocResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return fail("notFound");
  const draft = pendingDraft(doc);
  if (doc.cancelled || !draft || doc.versions.length <= 1) return fail("invalidState");

  await updateDb((db) => {
    const d = db.documents.find((d) => d.id === id)!;
    const removed = d.versions.pop()!;
    db.auditLog.push(
      auditEntry(user, "update", { type: "document", id, label: d.code }, {
        changes: [{ field: "version", from: `${removed.version} (draft)`, to: "discarded" }],
      }),
    );
  });
  refresh();
  return { ok: true };
}

/** Permanently delete a draft document that has never been published. Admin / QE only. */
export async function deleteDocument(id: string): Promise<DocResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return fail("notFound");
  if (doc.cancelled || doc.versions.length !== 1 || doc.versions[0]?.status !== "draft") {
    return fail("invalidState");
  }

  await updateDb((db) => {
    db.auditLog.push(
      auditEntry(user, "delete", { type: "document", id, label: doc.code }, {
        note: doc.title,
      }),
    );
    db.documents = db.documents.filter((d) => d.id !== id);
  });
  refresh();
  return { ok: true };
}

/** Record an annual/periodic review and update nextReviewDate. Admin / QE only. */
export async function markDocumentReviewed(id: string, nextReviewDateRaw: string): Promise<DocResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return fail("notFound");
  if (doc.cancelled || !publishedVersion(doc)) return fail("invalidState");

  const nextDate = clean(nextReviewDateRaw);
  if (!nextDate) return { ok: false, fieldErrors: { nextReviewDate: "required" } };
  if (!isValidIsoDate(nextDate)) return { ok: false, fieldErrors: { nextReviewDate: "invalidDate" } };

  await updateDb((db) => {
    const d = db.documents.find((d) => d.id === id)!;
    const fromDate = d.nextReviewDate ?? "";
    d.nextReviewDate = nextDate;
    db.auditLog.push(
      auditEntry(user, "update", { type: "document", id, label: d.code }, {
        changes: [{ field: "nextReviewDate", from: fromDate, to: nextDate }],
        note: "annual_review",
      }),
    );
  });
  refresh();
  return { ok: true };
}

/** Cancel (withdraw) a document. Versions are kept as history. Admin only. */
export async function cancelDocument(id: string, reasonRaw: string): Promise<DocResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return fail("notFound");
  if (doc.cancelled) return fail("invalidState");
  const reason = clean(reasonRaw);
  if (!reason) return { ok: false, fieldErrors: { reason: "required" } };

  await updateDb((db) => {
    const d = db.documents.find((d) => d.id === id)!;
    d.cancelled = { at: new Date().toISOString(), by: user.id, reason };
    db.auditLog.push(
      auditEntry(user, "cancel", { type: "document", id, label: d.code }, {
        changes: [{ field: "status", from: "active", to: "cancelled" }],
        note: reason,
      }),
    );
  });
  refresh();
  return { ok: true };
}

/* ---------------- Download rights ---------------- */

/** Set one Employee's limit (limitRaw = null → back to the document default). Admin only. */
export async function setUserLimit(id: string, userId: string, limitRaw: string | null): Promise<DocResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  if (!db.documents.some((d) => d.id === id) || getUserById(userId)?.role !== "employee") return fail("notFound");
  const limit = limitRaw === null ? null : parseLimit(limitRaw);
  if (typeof limit === "string") return { ok: false, fieldErrors: { limit } };

  await updateDb((db) => {
    const d = db.documents.find((d) => d.id === id)!;
    const from = userId in d.userLimits ? String(d.userLimits[userId]) : `default (${d.downloadLimit})`;
    if (limit === null) delete d.userLimits[userId];
    else d.userLimits[userId] = limit;
    const to = limit === null ? `default (${d.downloadLimit})` : String(limit);
    db.auditLog.push(
      auditEntry(user, "set_limit", { type: "document", id, label: d.code }, {
        changes: [{ field: `limit:${userId}`, from, to }],
      }),
    );
  });
  refresh();
  return { ok: true };
}

/** Reset an Employee's used count to 0 (the download log is kept). Admin only. */
export async function resetDownloads(id: string, userId: string): Promise<DocResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  if (!db.documents.some((d) => d.id === id) || !getUserById(userId)) return fail("notFound");

  await updateDb((db) => {
    const d = db.documents.find((d) => d.id === id)!;
    db.auditLog.push(
      auditEntry(user, "reset_downloads", { type: "document", id, label: d.code }, {
        changes: [{ field: `used:${userId}`, from: String(d.downloadsUsed[userId] ?? 0), to: "0" }],
      }),
    );
    delete d.downloadsUsed[userId];
  });
  refresh();
  return { ok: true };
}

/* ---------------- Download (simulated file) ---------------- */

const PDF_DOC_TYPE_TITLES: Record<DocumentType, string> = {
  QM: "คู่มือคุณภาพ (QUALITY MANUAL)",
  QP: "ระเบียบปฏิบัติงาน (QUALITY PROCEDURE)",
  EP: "ระเบียบปฏิบัติด้านสิ่งแวดล้อม (ENV. PROCEDURE)",
  WI: "วิธีปฏิบัติงาน (WORK INSTRUCTION)",
  FM: "แบบฟอร์มและบันทึกคุณภาพ (FORM / RECORD)",
  STD: "เอกสารมาตรฐานควบคุม (CONTROLLED STANDARD)",
};

export type DocumentPdfMeta = {
  code: string;
  docTypeLabel: string;
  clause?: string;
  nextReviewDate?: string;
  title: string;
  description: string;
  standard: string;
  version: number;
  effectiveDate: string;
  changeNote: string;
  department: string;
  owner: string;
  downloadedBy: string;
  downloadedAt: string;
};

export type DownloadResult =
  | { ok: true; fileName: string; content: string; docMeta: DocumentPdfMeta }
  | { ok: false; error: DocError };

/**
 * Download the published version. Employees use one download right per call;
 * Admin is unlimited. Returns a generated text file (Demo only).
 */
export async function downloadDocument(id: string): Promise<DownloadResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "forbidden" };
  const db = await readDb();
  const doc = db.documents.find((d) => d.id === id);
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  if (!doc || (!isPrivileged && (!isVisibleToEmployee(doc) || doc.departmentId !== user.departmentId))) {
    return { ok: false, error: "notFound" };
  }
  const version = publishedVersion(doc);
  if (!version || doc.cancelled) return { ok: false, error: "invalidState" };
  if (!isPrivileged && downloadQuota(doc, user.id).remaining <= 0) {
    return { ok: false, error: "limitReached" };
  }

  const at = new Date().toISOString();
  await updateDb((db) => {
    const d = db.documents.find((d) => d.id === id)!;
    if (!isPrivileged) d.downloadsUsed[user.id] = (d.downloadsUsed[user.id] ?? 0) + 1;
    d.downloadLog.push({ userId: user.id, version: version.version, at });
    db.auditLog.push(
      auditEntry(user, "download", { type: "document", id, label: d.code }, {
        note: `v${version.version}${isPrivileged ? "" : ` · ${d.downloadsUsed[user.id]}/${downloadQuota(d, user.id).limit}`}`,
      }),
    );
  });
  refresh();

  const s = db.standards.find((s) => s.id === doc.standardId);
  const dept = departments.find((d) => d.id === doc.departmentId);
  const owner = getUserById(doc.ownerId);

  const docType = inferDocumentType(doc.code, doc.docType);
  const docMeta: DocumentPdfMeta = {
    code: doc.code,
    docTypeLabel: PDF_DOC_TYPE_TITLES[docType],
    clause: doc.clause,
    nextReviewDate: doc.nextReviewDate,
    title: doc.title,
    description: doc.description || "–",
    standard: s ? `${s.code}:${s.version}` : "-",
    version: version.version,
    effectiveDate: version.publishedAt ?? "-",
    changeNote: version.changeNote || "–",
    department: dept ? dept.name : "-",
    owner: owner ? `${owner.name} (${owner.position || owner.nameEn})` : "-",
    downloadedBy: `${user.name} (${user.role.toUpperCase()})`,
    downloadedAt: at,
  };

  const content = [
    "QE Tracking System - Demo V.1 (ไฟล์จำลอง / Simulated file)",
    "================================================",
    `รหัสเอกสาร / Code      : ${doc.code}`,
    `ชื่อเอกสาร / Title      : ${doc.title}`,
    `มาตรฐาน / Standard     : ${s ? `${s.code}:${s.version}` : "-"}`,
    `เวอร์ชัน / Version      : ${version.version}`,
    `ประกาศใช้ / Effective  : ${version.publishedAt ?? "-"}`,
    `การเปลี่ยนแปลง / Change : ${version.changeNote}`,
    "",
    doc.description,
    "",
    `ดาวน์โหลดโดย / Downloaded by: ${user.nameEn} (${at})`,
    "เอกสารควบคุม - ห้ามแก้ไข / CONTROLLED COPY",
  ].join("\r\n");

  return { ok: true, fileName: downloadFileName(doc.code, version.version), content, docMeta };
}
