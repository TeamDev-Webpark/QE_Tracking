"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button, Card, CardTitle, ConfirmDialog, PageHeader, useToast } from "@/components/ui";
import { ArrowLeftIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { ResultBadge } from "@/components/standards/ResultBadge";
import { getUserById } from "@/data";
import { departmentName, formatDateTime } from "@/lib/format";
import { deleteNc } from "@/lib/nc/actions";
import type { NcView, SourceChecklistInfo } from "@/lib/nc/queries";
import { displayName } from "@/lib/user";
import { cn } from "@/lib/cn";
import { daysBetween, formatDateOnly, NcStatusBadge } from "./NcParts";
import { IssueCarDialog, ProgressDialog, VerifyDialog } from "./NcWorkflowDialogs";

type Dialog = "car" | "progress" | "verify";

export function NcDetail({
  nc,
  sourceChecklist,
  today,
}: {
  nc: NcView;
  sourceChecklist?: SourceChecklistInfo;
  today: string;
}) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const role = useSessionUser().role;
  const canAudit = role === "admin" || role === "iso" || role === "qe";
  const [dialog, setDialog] = useState<Dialog>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const close = () => setDialog(undefined);
  const userName = (id?: string) => {
    const u = id ? getUserById(id) : undefined;
    return u ? displayName(u, lang) : "-";
  };
  const value = (v: boolean | number) =>
    typeof v === "number" ? `${v.toLocaleString("en-US")}${sourceChecklist?.unit ? ` ${sourceChecklist.unit}` : ""}` : "";

  const carEditable = canAudit && (nc.status === "open" || nc.status === "in_progress");
  const overdue = nc.displayStatus === "overdue";

  return (
    <>
      <Link
        href="/corrective-actions"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeftIcon width={16} height={16} />
        {t.nav.correctiveActions}
      </Link>

      <PageHeader
        title={`${nc.number} · ${nc.title}`}
        description={`${nc.standardLabel}${nc.clause ? ` · ${nc.clause}` : ""} · ${departmentName(nc.departmentId, lang)}`}
        actions={
          <>
            {carEditable && (
              <Button variant={nc.car ? "secondary" : "primary"} onClick={() => setDialog("car")}>
                {nc.car ? t.nc.editCar : t.nc.issueCar}
              </Button>
            )}
            {canAudit && nc.status === "open" && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                {t.common.delete}
              </Button>
            )}
            {canAudit && nc.status === "pending_verification" && <Button onClick={() => setDialog("verify")}>{t.nc.verify}</Button>}
            {nc.canUpdate && (
              <Button onClick={() => setDialog("progress")}>
                {t.nc.submit}
              </Button>
            )}
          </>
        }
      />

      {!canAudit && !nc.car && <Notice>{t.nc.waitingCar}</Notice>}
      {!canAudit && nc.status === "pending_verification" && <Notice>{t.nc.waitingVerify}</Notice>}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Problem */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <CardTitle>{t.nc.description}</CardTitle>
            <NcStatusBadge status={nc.displayStatus} />
          </div>
          <p className="text-sm whitespace-pre-line">{nc.description}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Info label={t.nc.source} value={nc.source === "checklist" ? t.nc.sourceChecklist : t.nc.sourceManual} />
            <Info label={t.documents.createdAt} value={`${formatDateTime(nc.createdAt, lang)} · ${userName(nc.createdBy)}`} />
          </dl>

          {nc.checklist && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-control border border-border p-4 text-sm">
                <p className="mb-2 text-xs font-semibold text-text-muted">{t.nc.snapshot}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <ResultBadge passed={false} />
                  <span className="font-semibold">{value(nc.checklist.value)}</span>
                </div>
                <p className="mt-1 text-xs text-text-muted">{formatDateTime(nc.checklist.checkedAt, lang)}</p>
              </div>
              <div className="rounded-control border border-border p-4 text-sm">
                <p className="mb-2 text-xs font-semibold text-text-muted">{t.nc.currentResult}</p>
                {sourceChecklist?.latest ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <ResultBadge passed={sourceChecklist.latest.passed} />
                      <span className="font-semibold">{value(sourceChecklist.latest.value)}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{formatDateTime(sourceChecklist.latest.checkedAt, lang)}</p>
                  </>
                ) : (
                  <ResultBadge />
                )}
              </div>
            </div>
          )}
        </Card>

        {/* CAR */}
        <Card>
          <CardTitle className="mb-4">{t.nc.car}</CardTitle>
          {nc.car ? (
            <dl className="space-y-3 text-sm">
              <Info label={t.nc.carNumber} value={nc.car.number} />
              <Info label={t.nc.department} value={departmentName(nc.departmentId, lang)} />
              <Info label={t.nc.owner} value={userName(nc.car.ownerId)} />
              <Info
                label={t.nc.dueDate}
                value={
                  <span className={cn(overdue && "font-bold text-danger")}>
                    {formatDateOnly(nc.car.dueDate, lang)}
                    {overdue && ` · ${t.nc.overdueBy.replace("{n}", String(daysBetween(nc.car.dueDate, today)))}`}
                  </span>
                }
              />
            </dl>
          ) : (
            <p className="text-sm text-text-muted">{t.nc.noCar}</p>
          )}
        </Card>
      </div>

      <Card className="mb-6">
        <CardTitle className="mb-4">{t.nc.capaTitle}</CardTitle>
        <dl className="grid gap-4 text-sm md:grid-cols-3">
          <Info label={t.nc.rootCause} value={nc.rootCause || "–"} />
          <Info label={t.nc.correctiveAction} value={nc.correctiveAction || "–"} />
          <Info label={t.nc.preventiveAction} value={nc.preventiveAction || "–"} />
        </dl>
      </Card>

      <Card className="mb-6">
        <CardTitle className="mb-4">{t.nc.timeline}</CardTitle>
        {nc.verification && (
          <div className="mb-5 rounded-control bg-success-soft p-4 text-sm">
            <p className="font-bold text-success">
              ✓ {t.nc.verifiedBy.replace("{name}", userName(nc.verification.by)).replace("{date}", formatDateTime(nc.verification.at, lang))}
            </p>
            <p className="mt-1">{nc.verification.note}</p>
          </div>
        )}
        <ol className="space-y-4 border-l-2 border-primary-soft pl-5">
          {[...nc.events].reverse().map((e, i) => (
            <li key={i} className="relative text-sm">
              <span className="absolute top-1.5 -left-[27px] h-3 w-3 rounded-full border-2 border-surface bg-primary" />
              <p className="font-semibold">{t.ncEvent[e.type].replace("{n}", String(e.percent ?? ""))}</p>
              <p className="text-xs text-text-muted">
                {formatDateTime(e.at, lang)} · {userName(e.by)}
              </p>
              {e.note && <p className="mt-1 rounded-control bg-page px-3 py-2">{e.note}</p>}
            </li>
          ))}
        </ol>
      </Card>

      {dialog === "car" && <IssueCarDialog nc={nc} today={today} onClose={close} />}
      {dialog === "progress" && <ProgressDialog nc={nc} onClose={close} />}
      {dialog === "verify" && <VerifyDialog nc={nc} sourceChecklist={sourceChecklist} onClose={close} />}
      <ConfirmDialog
        open={confirmDelete}
        title={t.nc.deleteTitle}
        message={t.nc.deleteMessage.replace("{number}", nc.number)}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          startDelete(async () => {
            const res = await deleteNc(nc.id);
            setConfirmDelete(false);
            if (!res.ok) {
              if (res.error) toast.error(t.errors[res.error]);
              return;
            }
            toast.success(t.nc.deleted);
            router.push("/corrective-actions");
          });
        }}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-line">{value}</dd>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="mb-4 rounded-control bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">{children}</p>;
}
