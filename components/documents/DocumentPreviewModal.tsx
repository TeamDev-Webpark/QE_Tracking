"use client";

import { Button, Modal } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { getUserById } from "@/data";
import type { DocumentView } from "@/lib/documents/queries";
import { departmentName, formatDate, formatDateTime } from "@/lib/format";
import { displayName } from "@/lib/user";
import { DocumentStatusBadge, DocumentTypeBadge, ReviewStatusBadge } from "./StatusBadges";

interface DocumentPreviewModalProps {
  doc: DocumentView;
  onClose: () => void;
  onDownload?: () => void;
  downloading?: boolean;
}

export function DocumentPreviewModal({
  doc,
  onClose,
  onDownload,
  downloading = false,
}: DocumentPreviewModalProps) {
  const { lang, t } = useI18n();
  const owner = getUserById(doc.ownerId);
  const currentVersion = doc.published ?? doc.draft ?? doc.versions[0];
  const canDownload = doc.status === "published" && (doc.myQuota === null || doc.myQuota.remaining > 0);

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      closeLabel={t.common.close}
      title={`${t.documents.previewTitle} · ${doc.code}`}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs text-text-muted">
            {doc.myQuota === null
              ? t.documents.unlimited
              : t.documents.remainingOf
                  .replace("{remaining}", String(doc.myQuota.remaining))
                  .replace("{limit}", String(doc.myQuota.limit))}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t.common.close}
            </Button>
            {onDownload && doc.status === "published" && (
              <Button onClick={onDownload} disabled={downloading || !canDownload}>
                {downloading ? t.documents.downloading : `${t.documents.download} PDF`}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {/* Controlled Header Sheet */}
        <div className="rounded-control border border-border bg-page p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-primary">{doc.code}</span>
              <DocumentTypeBadge type={doc.docType} />
              <span className="text-xs font-semibold text-text-muted">{doc.standardLabel}</span>
              {doc.clause && (
                <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                  ข้อ {doc.clause}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <DocumentStatusBadge status={doc.status} />
              <ReviewStatusBadge status={doc.reviewStatus} />
            </div>
          </div>

          <h3 className="mt-2.5 text-base font-bold text-text">{doc.title}</h3>

          <dl className="mt-3 grid gap-2 border-t border-border/60 pt-3 text-xs sm:grid-cols-2">
            <div>
              <span className="text-text-muted">{t.checklist.department}: </span>
              <span className="font-semibold text-text">{departmentName(doc.departmentId, lang)}</span>
            </div>
            <div>
              <span className="text-text-muted">{t.documents.owner}: </span>
              <span className="font-semibold text-text">{owner ? displayName(owner, lang) : "-"}</span>
            </div>
            <div>
              <span className="text-text-muted">{t.documents.version}: </span>
              <span className="font-semibold text-text">
                {currentVersion ? `Rev.${currentVersion.version}` : "–"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">{t.documents.effectiveDate}: </span>
              <span className="font-semibold text-text">
                {doc.published?.publishedAt ? formatDateTime(doc.published.publishedAt, lang) : t.documents.notPublished}
              </span>
            </div>
            {doc.nextReviewDate && (
              <div className="sm:col-span-2">
                <span className="text-text-muted">{t.documents.nextReviewDate}: </span>
                <span className="font-semibold text-text">{formatDate(doc.nextReviewDate, lang)}</span>
              </div>
            )}
          </dl>
        </div>

        {/* Body Content */}
        <div className="rounded-control border border-border bg-surface p-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-text-muted">{t.documents.description}</p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-text">
              {doc.description || "–"}
            </p>
          </div>
          {currentVersion?.changeNote && (
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs font-bold text-text-muted">{t.documents.changeNote}</p>
              <p className="mt-1 text-text">{currentVersion.changeNote}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
