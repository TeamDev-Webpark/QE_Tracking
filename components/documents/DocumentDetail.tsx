"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge, Button, Card, CardTitle, ConfirmDialog, DataTable, Input, PageHeader, type Column, useToast } from "@/components/ui";
import { ArrowLeftIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { getUserById } from "@/data";
import {
  deleteDocument,
  discardDraft,
  publishDocument,
  resetDownloads,
  type DocResult,
} from "@/lib/documents/actions";
import type { DocumentRequirementOption, DocumentView, StandardOption } from "@/lib/documents/queries";
import { departmentName, formatDate, formatDateTime } from "@/lib/format";
import type { DocumentVersion } from "@/lib/types";
import { displayName } from "@/lib/user";
import { AdjustLimitDialog, CancelDocumentDialog, NewVersionDialog, ReviewDocumentDialog } from "./DocumentDialogs";
import { DocumentFormModal } from "./DocumentFormModal";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { DownloadMessage, QuotaText } from "./DownloadParts";
import { DocumentStatusBadge, DocumentTypeBadge, ReviewStatusBadge, VersionStatusBadge } from "./StatusBadges";
import { useDownload } from "./useDownload";

type Dialog =
  | { kind: "edit" }
  | { kind: "preview" }
  | { kind: "newVersion" }
  | { kind: "publish" }
  | { kind: "cancel" }
  | { kind: "discardDraft" }
  | { kind: "deleteDraft" }
  | { kind: "review" }
  | { kind: "adjust"; userId: string }
  | { kind: "reset"; userId: string };

export function DocumentDetail({
  doc,
  standards,
  requirements = [],
}: {
  doc: DocumentView;
  standards: StandardOption[];
  requirements?: DocumentRequirementOption[];
}) {
  const router = useRouter();
  const { lang, t } = useI18n();
  const toast = useToast();
  const role = useSessionUser().role;
  const canManage = role === "admin" || role === "qe";
  const isPrivileged = canManage || role === "iso";
  const [dialog, setDialog] = useState<Dialog>();
  const [rightsQuery, setRightsQuery] = useState("");
  const [deptRightsOnly, setDeptRightsOnly] = useState(false);
  const [confirmPending, startConfirm] = useTransition();
  const [actionError, setActionError] = useState<DocResult>();
  const { download, pending: downloading, message, clearMessage } = useDownload();

  const userName = (id?: string) => {
    const u = id ? getUserById(id) : undefined;
    return u ? displayName(u, lang) : "-";
  };
  const close = () => setDialog(undefined);
  const runConfirm = (action: () => Promise<DocResult>, successMsg: string, redirectAfter = false) =>
    startConfirm(async () => {
      const res = await action();
      setDialog(undefined);
      setActionError(res.ok ? undefined : res);
      if (res.ok) {
        toast.success(successMsg);
        if (redirectAfter) router.push("/documents");
      } else if (res.error) {
        toast.error(t.errors[res.error]);
      }
    });

  const active = doc.status !== "cancelled";
  const canDownload = doc.status === "published" && (doc.myQuota === null || doc.myQuota.remaining > 0);
  const nextVersion = (doc.versions[0]?.version ?? 0) + 1;

  const filteredRights = useMemo(() => {
    if (!doc.rights) return [];
    const q = rightsQuery.trim().toLowerCase();
    return doc.rights.filter((r) => {
      const u = getUserById(r.userId);
      if (deptRightsOnly && u?.departmentId !== doc.departmentId) return false;
      if (!q) return true;
      const text = u ? `${u.name} ${u.nameEn} ${departmentName(u.departmentId, lang)}`.toLowerCase() : r.userId;
      return text.includes(q);
    });
  }, [doc.rights, doc.departmentId, rightsQuery, deptRightsOnly, lang]);

  const versionColumns: Column<DocumentVersion>[] = [
    { key: "v", header: t.documents.version, className: "w-20 font-bold", render: (v) => `v${v.version}` },
    { key: "note", header: t.documents.changeNote, render: (v) => v.changeNote },
    { key: "status", header: t.documents.status, render: (v) => <VersionStatusBadge status={v.status} /> },
    {
      key: "dates",
      header: `${t.documents.createdAt} / ${t.documents.publishedAt}`,
      render: (v) => (
        <div className="text-xs whitespace-nowrap text-text-muted">
          <p>
            {formatDateTime(v.createdAt, lang)} · {userName(v.createdBy)}
          </p>
          {v.publishedAt && (
            <p className="font-semibold text-text">
              {t.documents.publishedAt} {formatDateTime(v.publishedAt, lang)} · {userName(v.publishedBy)}
            </p>
          )}
        </div>
      ),
    },
  ];

  type Right = NonNullable<DocumentView["rights"]>[number];
  const rightsColumns: Column<Right>[] = [
    {
      key: "user",
      header: t.documents.employee,
      render: (r) => {
        const u = getUserById(r.userId);
        return (
          <div>
            <span className="font-semibold">{userName(r.userId)}</span>
            {u && (
              <p className="text-xs text-text-muted">
                {departmentName(u.departmentId, lang)}
                {u.departmentId === doc.departmentId ? " · แผนกเจ้าของเอกสาร" : ""}
              </p>
            )}
          </div>
        );
      },
    },
    { key: "used", header: t.documents.used, className: "tabular-nums", render: (r) => r.quota.used },
    {
      key: "limit",
      header: t.documents.limit,
      render: (r) => (
        <span className="flex items-center gap-2 tabular-nums">
          {r.quota.limit}
          <Badge tone={r.quota.custom ? "primary" : "neutral"}>{r.quota.custom ? t.documents.custom : t.documents.default}</Badge>
        </span>
      ),
    },
    { key: "remaining", header: t.documents.remaining, render: (r) => <QuotaText quota={r.quota} /> },
    {
      key: "actions",
      header: t.common.actions,
      className: "w-px text-right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: "adjust", userId: r.userId })}>
            {t.documents.adjust}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={r.quota.used === 0}
            onClick={() => setDialog({ kind: "reset", userId: r.userId })}
          >
            {t.documents.reset}
          </Button>
        </div>
      ),
    },
  ];

  type LogEntry = NonNullable<DocumentView["downloadLog"]>[number];
  const downloadLogColumns: Column<LogEntry>[] = [
    {
      key: "at",
      header: t.documents.downloadedAt,
      className: "whitespace-nowrap",
      render: (entry) => formatDateTime(entry.at, lang),
    },
    {
      key: "user",
      header: t.documents.downloadedBy,
      render: (entry) => {
        const u = getUserById(entry.userId);
        return (
          <div>
            <span className="font-semibold">{userName(entry.userId)}</span>
            {u && <p className="text-xs text-text-muted">{departmentName(u.departmentId, lang)}</p>}
          </div>
        );
      },
    },
    {
      key: "version",
      header: t.documents.downloadedVersion,
      className: "w-24 font-bold",
      render: (entry) => `v${entry.version}`,
    },
  ];

  const adjustingRight = dialog?.kind === "adjust" ? doc.rights?.find((r) => r.userId === dialog.userId) : undefined;

  return (
    <>
      <Link href="/documents" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeftIcon width={16} height={16} />
        {t.nav.documents}
      </Link>

      <PageHeader
        title={`${doc.code} · ${doc.title}`}
        description={`${doc.standardLabel} · ${departmentName(doc.departmentId, lang)}${doc.clause ? ` · ข้อ ${doc.clause}` : ""}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog({ kind: "preview" })}>
              {t.documents.preview}
            </Button>
            {canManage && active && (
              <>
                <Button variant="secondary" onClick={() => setDialog({ kind: "edit" })}>
                  <EditIcon width={16} height={16} />
                  {t.common.edit}
                </Button>
                {doc.draft ? (
                  <>
                    <Button onClick={() => setDialog({ kind: "publish" })}>
                      {t.documents.publish} v{doc.draft.version}
                    </Button>
                    {!doc.canDeleteDraft && (
                      <Button variant="secondary" onClick={() => setDialog({ kind: "discardDraft" })}>
                        {t.documents.discardDraft.replace("{n}", String(doc.draft.version))}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setDialog({ kind: "newVersion" })}>
                    <PlusIcon width={16} height={16} />
                    {t.documents.newVersion}
                  </Button>
                )}
                {doc.status === "published" && (
                  <Button variant="secondary" onClick={() => setDialog({ kind: "review" })}>
                    {t.documents.markReviewed}
                  </Button>
                )}
                {doc.canDeleteDraft ? (
                  <Button variant="danger" onClick={() => setDialog({ kind: "deleteDraft" })}>
                    <TrashIcon width={16} height={16} />
                    {t.documents.deleteDraft}
                  </Button>
                ) : (
                  <Button variant="danger" onClick={() => setDialog({ kind: "cancel" })}>
                    {t.documents.cancel}
                  </Button>
                )}
              </>
            )}
            {doc.status === "published" && (
              <Button onClick={() => download(doc.id)} disabled={downloading || !canDownload}>
                {downloading ? t.documents.downloading : t.documents.download}
              </Button>
            )}
          </>
        }
      />

      <DownloadMessage message={message} onClose={clearMessage} />
      {actionError && !actionError.ok && actionError.error && (
        <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {t.errors[actionError.error]}
        </p>
      )}
      {doc.cancelled && (
        <p className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {t.documents.cancelledInfo
            .replace("{date}", formatDateTime(doc.cancelled.at, lang))
            .replace("{reason}", doc.cancelled.reason)}
        </p>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">{t.documents.info}</CardTitle>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Info
              label={t.documents.status}
              value={
                <span className="flex flex-wrap items-center gap-2">
                  <DocumentStatusBadge status={doc.status} />
                  <DocumentTypeBadge type={doc.docType} />
                </span>
              }
            />
            <Info
              label={t.documents.version}
              value={
                <span className="flex flex-wrap items-center gap-2 font-bold">
                  {doc.published ? `v${doc.published.version}` : "–"}
                  {doc.draft && active && (
                    <Badge tone="warning">{t.documents.pendingDraft.replace("{n}", String(doc.draft.version))}</Badge>
                  )}
                </span>
              }
            />
            <Info
              label={t.documents.effectiveDate}
              value={doc.published?.publishedAt ? formatDateTime(doc.published.publishedAt, lang) : t.documents.notPublished}
            />
            <Info label={t.documents.owner} value={userName(doc.ownerId)} />
            <Info
              label={t.documents.clause}
              value={doc.clause ? `ข้อ ${doc.clause}` : "–"}
            />
            <Info
              label={t.documents.nextReviewDate}
              value={
                <span className="flex flex-wrap items-center gap-2">
                  <span>{doc.nextReviewDate ? formatDate(doc.nextReviewDate, lang) : t.documents.reviewStatus.none}</span>
                  <ReviewStatusBadge status={doc.reviewStatus} />
                </span>
              }
            />
            <div className="sm:col-span-2">
              <Info label={t.documents.description} value={doc.description || "–"} />
            </div>
            {doc.published && (
              <div className="sm:col-span-2">
                <Info label={t.documents.changeNote} value={doc.published.changeNote} />
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardTitle className="mb-4">{t.documents.remaining}</CardTitle>
          {doc.myQuota === null ? (
            <p className="text-sm text-text-muted">{t.documents.unlimited}</p>
          ) : (
            <>
              <p className="text-5xl font-bold">{doc.myQuota.remaining}</p>
              <p className="mt-2 text-sm text-text-muted">
                {t.documents.remainingOf
                  .replace("{remaining}", String(doc.myQuota.remaining))
                  .replace("{limit}", String(doc.myQuota.limit))}{" "}
                · {t.documents.used} {doc.myQuota.used}
              </p>
              {doc.myQuota.remaining === 0 && (
                <p className="mt-3 rounded-control bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                  {t.documents.noRightsLeft}
                </p>
              )}
            </>
          )}
          <p className="mt-4 text-xs text-text-muted">{t.documents.simulated}</p>
        </Card>
      </div>

      <Card className="mb-6">
        <CardTitle className="mb-4">{t.documents.versionHistory}</CardTitle>
        <DataTable columns={versionColumns} rows={doc.versions} rowKey={(v) => String(v.version)} />
      </Card>

      {isPrivileged && doc.downloadLog && (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <CardTitle>{t.documents.downloadLog}</CardTitle>
            <Badge tone="neutral">{doc.downloadLog.length}</Badge>
          </div>
          <DataTable
            columns={downloadLogColumns}
            rows={doc.downloadLog}
            rowKey={(e) => `${e.userId}-${e.at}-${e.version}`}
            emptyTitle={t.documents.downloadLogEmpty}
          />
        </Card>
      )}

      {canManage && doc.rights && (
        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t.documents.rightsTitle}</CardTitle>
              <p className="text-xs text-text-muted">
                {t.documents.rightsNote
                  .replace("{n}", String(doc.downloadLimit))
                  .replace("{total}", String(doc.totalDownloads ?? 0))}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  value={rightsQuery}
                  onChange={(e) => setRightsQuery(e.target.value)}
                  placeholder="ค้นหาพนักงาน..."
                  className="h-9 pl-9 sm:w-48"
                />
              </div>
              <button
                type="button"
                onClick={() => setDeptRightsOnly((v) => !v)}
                className={`rounded-control border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  deptRightsOnly
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-text-muted hover:text-text"
                }`}
              >
                เฉพาะแผนกเจ้าของเอกสาร
              </button>
            </div>
          </div>
          <DataTable columns={rightsColumns} rows={filteredRights} rowKey={(r) => r.userId} />
        </Card>
      )}

      {dialog?.kind === "edit" && (
        <DocumentFormModal doc={doc} standards={standards} requirements={requirements} onClose={close} />
      )}
      {dialog?.kind === "preview" && (
        <DocumentPreviewModal
          doc={doc}
          onClose={close}
          onDownload={() => download(doc.id)}
          downloading={downloading}
        />
      )}
      {dialog?.kind === "newVersion" && <NewVersionDialog docId={doc.id} nextVersion={nextVersion} onClose={close} />}
      {dialog?.kind === "cancel" && <CancelDocumentDialog docId={doc.id} code={doc.code} onClose={close} />}
      {dialog?.kind === "review" && <ReviewDocumentDialog docId={doc.id} onClose={close} />}
      {adjustingRight && (
        <AdjustLimitDialog
          docId={doc.id}
          userId={adjustingRight.userId}
          userName={userName(adjustingRight.userId)}
          currentLimit={adjustingRight.quota.limit}
          custom={adjustingRight.quota.custom}
          onClose={close}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === "publish"}
        title={t.documents.publishTitle}
        message={t.documents.publishMessage.replace("{code}", doc.code).replace("{n}", String(doc.draft?.version ?? ""))}
        confirmLabel={t.documents.publish}
        cancelLabel={t.common.cancel}
        confirmVariant="primary"
        pending={confirmPending}
        onConfirm={() => runConfirm(() => publishDocument(doc.id), t.documents.published)}
        onCancel={close}
      />
      <ConfirmDialog
        open={dialog?.kind === "discardDraft"}
        title={t.documents.discardDraftTitle}
        message={t.documents.discardDraftMessage
          .replace("{code}", doc.code)
          .replace("{n}", String(doc.draft?.version ?? ""))}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={confirmPending}
        onConfirm={() => runConfirm(() => discardDraft(doc.id), t.documents.draftDiscarded)}
        onCancel={close}
      />
      <ConfirmDialog
        open={dialog?.kind === "deleteDraft"}
        title={t.documents.deleteDraftTitle}
        message={t.documents.deleteDraftMessage.replace("{code}", doc.code)}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={confirmPending}
        onConfirm={() => runConfirm(() => deleteDocument(doc.id), t.documents.deleted, true)}
        onCancel={close}
      />
      <ConfirmDialog
        open={dialog?.kind === "reset"}
        title={t.documents.resetTitle}
        message={t.documents.resetMessage.replace("{name}", userName(dialog?.kind === "reset" ? dialog.userId : undefined))}
        confirmLabel={t.documents.reset}
        cancelLabel={t.common.cancel}
        confirmVariant="primary"
        pending={confirmPending}
        onConfirm={() =>
          dialog?.kind === "reset" && runConfirm(() => resetDownloads(doc.id, dialog.userId), t.documents.downloadsReset)
        }
        onCancel={close}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
