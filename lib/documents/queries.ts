import { connection } from "next/server";
import { getUsers } from "@/data";
import { readDb, type DemoDb } from "@/lib/db";
import {
  documentStatus,
  downloadQuota,
  inferDocumentType,
  isVisibleToEmployee,
  pendingDraft,
  publishedVersion,
  reviewHealth,
  type DownloadQuota,
  type ReviewStatus,
} from "@/lib/documents";
import type { DocumentStatus, DocumentType, DocumentVersion, IsoDocument, User } from "@/lib/types";

/** What the UI receives. Employees get a reduced view (no drafts, no other users' data). */
export type DocumentView = {
  id: string;
  code: string;
  docType: DocumentType;
  clause?: string;
  nextReviewDate?: string;
  reviewStatus: ReviewStatus;
  canDeleteDraft: boolean;
  title: string;
  description: string;
  standardId: string;
  standardLabel: string;
  departmentId: string;
  ownerId: string;
  status: DocumentStatus;
  cancelled?: IsoDocument["cancelled"];
  published?: DocumentVersion;
  draft?: DocumentVersion; // Admin only
  versions: DocumentVersion[]; // newest first; Employee: drafts removed
  downloadLimit: number;
  myQuota: DownloadQuota | null; // null = unlimited (Admin)
  rights?: { userId: string; quota: DownloadQuota }[]; // Admin only: every Employee
  totalDownloads?: number; // Admin only
  downloadLog?: { userId: string; version: number; at: string }[]; // newest first, privileged only
};

export type StandardOption = { id: string; label: string };
export type DocumentRequirementOption = {
  id: string;
  standardId: string;
  number: string;
  name: string;
  departmentId: string;
};

function toView(doc: IsoDocument, db: DemoDb, user: User): DocumentView {
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const canManage = user.role === "admin" || user.role === "qe";
  const s = db.standards.find((s) => s.id === doc.standardId);
  const versions = [...doc.versions].reverse().filter((v) => isPrivileged || v.status !== "draft");
  const canDeleteDraft =
    canManage && !doc.cancelled && doc.versions.length === 1 && doc.versions[0]?.status === "draft";
  const view: DocumentView = {
    id: doc.id,
    code: doc.code,
    docType: inferDocumentType(doc.code, doc.docType),
    clause: doc.clause,
    nextReviewDate: doc.nextReviewDate,
    reviewStatus: reviewHealth(doc),
    canDeleteDraft,
    title: doc.title,
    description: doc.description,
    standardId: doc.standardId,
    standardLabel: s ? `${s.code}:${s.version}` : "-",
    departmentId: doc.departmentId,
    ownerId: doc.ownerId,
    status: documentStatus(doc),
    cancelled: doc.cancelled,
    published: publishedVersion(doc),
    draft: isPrivileged ? pendingDraft(doc) : undefined,
    versions,
    downloadLimit: doc.downloadLimit,
    myQuota: isPrivileged ? null : downloadQuota(doc, user.id),
  };
  if (isPrivileged) {
    view.totalDownloads = doc.downloadLog.length;
    view.downloadLog = [...doc.downloadLog].reverse();
  }
  if (canManage) {
    view.rights = getUsers()
      .filter((u) => u.role === "employee")
      .map((u) => ({ userId: u.id, quota: downloadQuota(doc, u.id) }));
  }
  return view;
}

const standardOptions = (db: DemoDb): StandardOption[] =>
  db.standards.map((s) => ({ id: s.id, label: `${s.code}:${s.version}` }));

const requirementOptions = (db: DemoDb): DocumentRequirementOption[] =>
  db.requirements.map((r) => ({
    id: r.id,
    standardId: r.standardId,
    number: r.number,
    name: r.name,
    departmentId: r.departmentId,
  }));

/** Document list for the current user. Call only inside <Suspense>. */
export async function getDocumentList(user: User) {
  await connection();
  const db = await readDb();
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const docs = isPrivileged
    ? db.documents
    : db.documents.filter((d) => isVisibleToEmployee(d) && d.departmentId === user.departmentId);
  return {
    documents: docs.map((d) => toView(d, db, user)),
    standards: standardOptions(db),
    requirements: requirementOptions(db),
  };
}

/** One document, or undefined if missing / not visible to this user. Call only inside <Suspense>. */
export async function getDocumentDetail(id: string, user: User) {
  await connection();
  const db = await readDb();
  const doc = db.documents.find((d) => d.id === id);
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  if (!doc || (!isPrivileged && (!isVisibleToEmployee(doc) || doc.departmentId !== user.departmentId))) {
    return undefined;
  }
  return {
    document: toView(doc, db, user),
    standards: standardOptions(db),
    requirements: requirementOptions(db),
  };
}
