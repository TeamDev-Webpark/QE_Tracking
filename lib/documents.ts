import type { DocumentStatus, DocumentType, DocumentVersion, IsoDocument } from "./types";

export const MAX_DOWNLOAD_LIMIT = 99;
export const DOCUMENT_TYPES: readonly DocumentType[] = ["QM", "QP", "EP", "WI", "FM", "STD"];

export type ReviewStatus = "overdue" | "due_soon" | "ok" | "none";

/** Resolve document type from explicit field or code prefix (e.g. "WI-PRD-010" → "WI"). */
export function inferDocumentType(code: string, docType?: DocumentType): DocumentType {
  if (docType && DOCUMENT_TYPES.includes(docType)) return docType;
  const prefix = code.trim().toUpperCase().split(/[-_\s]/)[0];
  if (prefix === "QM" || prefix === "QP" || prefix === "EP" || prefix === "WI" || prefix === "FM") {
    return prefix;
  }
  return "STD";
}

/** Return YYYY-MM-DD 1 year from a date/ISO timestamp (defaults to today + 1 year). */
export function defaultNextReviewDate(fromIso?: string): string {
  const base = fromIso ? new Date(fromIso) : new Date();
  const safe = Number.isNaN(base.getTime()) ? new Date() : base;
  const next = new Date(safe);
  next.setFullYear(next.getFullYear() + 1);
  return next.toISOString().slice(0, 10);
}

/** Annual review health for active published documents. */
export function reviewHealth(
  doc: Pick<IsoDocument, "versions" | "cancelled" | "nextReviewDate">,
  todayIso = new Date().toISOString().slice(0, 10),
): ReviewStatus {
  if (documentStatus(doc) !== "published" || !doc.nextReviewDate) return "none";
  if (doc.nextReviewDate < todayIso) return "overdue";
  const today = new Date(`${todayIso}T00:00:00Z`).getTime();
  const target = new Date(`${doc.nextReviewDate}T00:00:00Z`).getTime();
  const days = (target - today) / 86_400_000;
  return days <= 30 ? "due_soon" : "ok";
}

/** The newest version (draft or published). */
export function latestVersion(doc: Pick<IsoDocument, "versions">): DocumentVersion {
  return doc.versions[doc.versions.length - 1];
}

/** The version currently in effect (at most one is "published"). */
export function publishedVersion(doc: Pick<IsoDocument, "versions">): DocumentVersion | undefined {
  return doc.versions.find((v) => v.status === "published");
}

/** A draft waiting to be published, if any (always the latest version). */
export function pendingDraft(doc: Pick<IsoDocument, "versions">): DocumentVersion | undefined {
  const latest = latestVersion(doc);
  return latest?.status === "draft" ? latest : undefined;
}

/** cancelled > published (has an effective version) > draft. */
export function documentStatus(doc: Pick<IsoDocument, "versions" | "cancelled">): DocumentStatus {
  if (doc.cancelled) return "cancelled";
  return publishedVersion(doc) ? "published" : "draft";
}

/** Employees may only see documents that are in effect. */
export function isVisibleToEmployee(doc: Pick<IsoDocument, "versions" | "cancelled">) {
  return documentStatus(doc) === "published";
}

export type DownloadQuota = { limit: number; used: number; remaining: number; custom: boolean };

/** Download rights of one user for one document. */
export function downloadQuota(
  doc: Pick<IsoDocument, "downloadLimit" | "userLimits" | "downloadsUsed">,
  userId: string,
): DownloadQuota {
  const custom = userId in doc.userLimits;
  const limit = custom ? doc.userLimits[userId] : doc.downloadLimit;
  const used = doc.downloadsUsed[userId] ?? 0;
  return { limit, used, remaining: Math.max(0, limit - used), custom };
}

/** File name of the download, e.g. "QP-001_v2.pdf". */
export function downloadFileName(code: string, version: number) {
  return `${code.replace(/[^\w.-]+/g, "_")}_v${version}.pdf`;
}
