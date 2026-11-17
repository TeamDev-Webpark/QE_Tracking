"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, PageHeader, type Column } from "@/components/ui";
import { DownloadIcon, FormIcon, InfoIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { departments } from "@/data/departments";
import { DOCUMENT_TYPES } from "@/lib/documents";
import type { DocumentRequirementOption, DocumentView, StandardOption } from "@/lib/documents/queries";
import type { DocumentStatus, DocumentType } from "@/lib/types";
import { departmentName, formatDate, formatDateTime } from "@/lib/format";
import { DocumentFormModal } from "./DocumentFormModal";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { DocumentStatusBadge, DocumentTypeBadge, ReviewStatusBadge } from "./StatusBadges";
import { DownloadMessage, QuotaText } from "./DownloadParts";
import { useDownload } from "./useDownload";
import { DocumentFormDesigner } from "./designer/DocumentFormDesigner";
import { DocumentFormFiller } from "./designer/DocumentFormFiller";

type QuickTab = "all" | DocumentStatus | "needs_review";

/** Admin: all documents (any status). Employee: published documents only (filtered on the server). */
export function DocumentList({
  documents,
  standards,
  requirements = [],
}: {
  documents: DocumentView[];
  standards: StandardOption[];
  requirements?: DocumentRequirementOption[];
}) {
  const { lang, t } = useI18n();
  const role = useSessionUser().role;
  const canManage = role === "admin" || role === "qe";
  const canSeeAll = role === "admin" || role === "qe" || role === "iso";
  const [adding, setAdding] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentView>();
  const [formModalDoc, setFormModalDoc] = useState<{ doc: DocumentView; mode: "fill" | "design" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [standardFilter, setStandardFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [statusTab, setStatusTab] = useState<QuickTab>("all");
  const { download, pending, message, clearMessage } = useDownload();

  const counts = useMemo(() => {
    let published = 0;
    let draft = 0;
    let cancelled = 0;
    let needs_review = 0;
    for (const d of documents) {
      if (d.status === "published") published++;
      else if (d.status === "draft") draft++;
      else cancelled++;
      if (d.reviewStatus === "overdue" || d.reviewStatus === "due_soon") needs_review++;
    }
    return { all: documents.length, published, draft, cancelled, needs_review };
  }, [documents]);

  const rows = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return documents.filter((d) => {
      if (deptFilter !== "all" && d.departmentId !== deptFilter) return false;
      if (standardFilter !== "all" && d.standardId !== standardFilter) return false;
      if (typeFilter !== "all" && d.docType !== typeFilter) return false;
      if (statusTab === "needs_review") {
        if (d.reviewStatus !== "overdue" && d.reviewStatus !== "due_soon") return false;
      } else if (statusTab !== "all" && d.status !== statusTab) {
        return false;
      }
      if (q) {
        const text = `${d.code} ${d.docType} ${d.clause ?? ""} ${d.title} ${d.description ?? ""} ${d.standardLabel} ${departmentName(d.departmentId, lang)}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [documents, deferredSearch, deptFilter, standardFilter, typeFilter, statusTab, lang]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    deptFilter !== "all" ||
    standardFilter !== "all" ||
    typeFilter !== "all" ||
    statusTab !== "all";

  const columns: Column<DocumentView>[] = [
    {
      key: "code",
      header: t.documents.code,
      className: "w-40 lg:w-auto",
      render: (d) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="font-bold whitespace-nowrap">{d.code}</p>
            <DocumentTypeBadge type={d.docType} />
          </div>
          <p className="text-xs whitespace-nowrap text-text-muted">
            {d.standardLabel}
            {d.clause ? ` · ข้อ ${d.clause}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "title",
      header: t.documents.title,
      render: (d) => (
        <>
          <p className="font-semibold">{d.title}</p>
          <p className="text-xs text-text-muted">{departmentName(d.departmentId, lang)}</p>
        </>
      ),
    },
    {
      key: "version",
      header: t.documents.version,
      className: "whitespace-nowrap",
      render: (d) => (
        <div className="space-y-1">
          <p className="font-bold">{d.published ? `v${d.published.version}` : "–"}</p>
          {d.draft && d.status !== "cancelled" && (
            <Badge tone="warning">{t.documents.pendingDraft.replace("{n}", String(d.draft.version))}</Badge>
          )}
        </div>
      ),
    },
    ...(canSeeAll
      ? [
          {
            key: "status",
            header: t.documents.status,
            className: "whitespace-nowrap",
            render: (d: DocumentView) => (
              <div className="flex flex-col items-start gap-1">
                <DocumentStatusBadge status={d.status} />
                {(d.reviewStatus === "overdue" || d.reviewStatus === "due_soon") && (
                  <ReviewStatusBadge status={d.reviewStatus} />
                )}
              </div>
            ),
          },
        ]
      : []),
    {
      key: "effective",
      header: t.documents.effectiveDate,
      render: (d) => (
        <div className="text-xs whitespace-nowrap space-y-0.5">
          <p className="text-sm text-text">
            {d.published?.publishedAt ? formatDateTime(d.published.publishedAt, lang) : t.documents.notPublished}
          </p>
          {d.nextReviewDate && d.status === "published" && (
            <p className="text-text-muted">ทบทวน: {formatDate(d.nextReviewDate, lang)}</p>
          )}
        </div>
      ),
    },
    {
      key: "quota",
      header: t.documents.remaining,
      className: "whitespace-nowrap",
      render: (d) => <QuotaText quota={d.myQuota} />,
    },
    {
      key: "actions",
      header: t.common.actions,
      className: "w-px text-right whitespace-nowrap",
      render: (d) => {
        const canDownload = d.status === "published" && (d.myQuota === null || d.myQuota.remaining > 0);
        return (
          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setFormModalDoc({ doc: d, mode: "fill" })}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-600 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
              title="เปิดกรอกแบบฟอร์ม / ดูประวัติบันทึก"
              aria-label="เปิดกรอกแบบฟอร์ม / ดูประวัติบันทึก"
            >
              <FormIcon width={19} height={19} />
            </button>
            <Link
              href={`/documents/${d.id}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text hover:bg-page hover:text-primary hover:border-primary/40 transition-all shadow-xs hover:scale-105 active:scale-95"
              title={t.documents.view}
              aria-label={t.documents.view}
            >
              <InfoIcon width={19} height={19} />
            </Link>
            {d.status === "published" && (
              <button
                type="button"
                onClick={() => download(d.id)}
                disabled={pending || !canDownload}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                title={canDownload ? t.documents.download : t.documents.noRightsLeft}
                aria-label={t.documents.download}
              >
                <DownloadIcon width={19} height={19} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.documents}
        description={t.pages.documents}
        actions={
          canManage && (
            <Button onClick={() => setAdding(true)}>
              <PlusIcon width={18} height={18} />
              {t.documents.add}
            </Button>
          )
        }
      />
      <DownloadMessage message={message} onClose={clearMessage} />
      <Card>
        <div className="mb-4 space-y-3 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge tone="primary">{t.dashboard.items.replace("{n}", String(rows.length))}</Badge>
              {rows.length !== documents.length && (
                <span className="text-xs text-text-muted">(กรองจากทั้งหมด {documents.length} รายการ)</span>
              )}
            </div>

            {canSeeAll ? (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-page/70 p-1">
                <button
                  type="button"
                  onClick={() => setStatusTab("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    statusTab === "all" ? "bg-surface text-primary shadow-xs" : "text-text-muted hover:text-text"
                  }`}
                >
                  {t.dashboard.all} ({counts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusTab("published")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    statusTab === "published" ? "bg-success text-white shadow-xs" : "text-text-muted hover:text-success"
                  }`}
                >
                  {t.documentStatus.published} ({counts.published})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusTab("draft")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    statusTab === "draft" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:text-primary"
                  }`}
                >
                  {t.documentStatus.draft} ({counts.draft})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusTab("cancelled")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    statusTab === "cancelled" ? "bg-border text-text shadow-xs" : "text-text-muted hover:text-text"
                  }`}
                >
                  {t.documentStatus.cancelled} ({counts.cancelled})
                </button>
                {counts.needs_review > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusTab("needs_review")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      statusTab === "needs_review" ? "bg-warning text-white shadow-xs" : "text-warning hover:bg-warning-soft"
                    }`}
                  >
                    ถึงกำหนดทบทวน ({counts.needs_review})
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-muted">{t.documents.simulated}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5">
            <label className="relative flex-1 min-w-0 sm:min-w-[220px]">
              <span className="sr-only">{t.common.search}</span>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" width={15} height={15} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารหัส, ชื่อเอกสาร, ข้อกำหนด, แผนก..."
                className="h-9 w-full rounded-lg border border-border/80 bg-surface pl-8 pr-3 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden transition-colors"
              />
            </label>

            <select
              aria-label={t.documents.docType}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as DocumentType | "all")}
              className="h-9 rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text transition-colors hover:border-primary/40 focus:border-primary focus:outline-hidden cursor-pointer"
            >
              <option value="all">ทุกประเภทเอกสาร</option>
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {t.documents.docTypeLabels[dt]}
                </option>
              ))}
            </select>

            <select
              aria-label="มาตรฐาน ISO"
              value={standardFilter}
              onChange={(e) => setStandardFilter(e.target.value)}
              className="h-9 rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text transition-colors hover:border-primary/40 focus:border-primary focus:outline-hidden cursor-pointer"
            >
              <option value="all">ทุกมาตรฐาน ISO</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            {canSeeAll && (
              <select
                id="doc-dept-select"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-9 sm:min-w-[190px] rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text transition-colors hover:border-primary/40 focus:border-primary focus:outline-hidden cursor-pointer"
              >
                <option value="all">
                  🏢 {t.dashboard.all} ({documents.length})
                </option>
                {departments.map((d) => {
                  const count = documents.filter((doc) => doc.departmentId === d.id).length;
                  return (
                    <option key={d.id} value={d.id}>
                      {departmentName(d.id, lang)} ({count})
                    </option>
                  );
                })}
              </select>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setDeptFilter("all");
                  setStandardFilter("all");
                  setTypeFilter("all");
                  setStatusTab("all");
                }}
                className="rounded-lg border border-border/80 bg-page px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft transition-colors cursor-pointer shrink-0"
              >
                ✕ ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(d) => d.id}
          emptyTitle={hasActiveFilters ? "ไม่พบเอกสารที่ตรงกับเงื่อนไขการค้นหา" : canSeeAll ? t.documents.empty : t.documents.emptyEmployee}
        />
      </Card>
      {adding && (
        <DocumentFormModal
          standards={standards}
          requirements={requirements}
          onClose={() => setAdding(false)}
        />
      )}
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(undefined)}
          onDownload={() => download(previewDoc.id)}
          downloading={pending}
        />
      )}
      {formModalDoc && formModalDoc.mode === "design" && (
        <DocumentFormDesigner
          documentId={formModalDoc.doc.id}
          documentCode={formModalDoc.doc.code}
          documentTitle={formModalDoc.doc.title}
          onClose={() => setFormModalDoc(null)}
          onOpenFiller={() => setFormModalDoc({ doc: formModalDoc.doc, mode: "fill" })}
        />
      )}
      {formModalDoc && formModalDoc.mode === "fill" && (
        <DocumentFormFiller
          documentId={formModalDoc.doc.id}
          documentCode={formModalDoc.doc.code}
          documentTitle={formModalDoc.doc.title}
          canDesign={canManage}
          onClose={() => setFormModalDoc(null)}
          onOpenDesigner={() => setFormModalDoc({ doc: formModalDoc.doc, mode: "design" })}
        />
      )}
    </>
  );
}
