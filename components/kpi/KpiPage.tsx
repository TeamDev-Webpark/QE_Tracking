"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { Button, Card, CardTitle, ConfirmDialog, DataTable, PageHeader, useToast, type Column } from "@/components/ui";
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { StatTile } from "@/components/dashboard/StatTile";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { getUserById } from "@/data";
import { departments } from "@/data/departments";
import { departmentName, formatDateTime } from "@/lib/format";
import { deleteKpi } from "@/lib/kpi/actions";
import type { KpiStatus } from "@/lib/kpi";
import type { KpiView, StandardOption } from "@/lib/kpi/queries";
import { displayName } from "@/lib/user";
import { cn } from "@/lib/cn";
import { KpiFormModal } from "./KpiFormModal";
import { fmt, KpiCards, KpiBullet, KpiStatusBadge } from "./KpiParts";

/** "2026-10" → "ต.ค. 2569" / "Oct 2026". */
function formatMonth(period: string, lang: "th" | "en") {
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${period}-01T00:00:00Z`),
  );
}

export function KpiPage({ kpis, standards, defaultPeriod }: { kpis: KpiView[]; standards: StandardOption[]; defaultPeriod: string }) {
  const { lang, t } = useI18n();
  const toast = useToast();
  const user = useSessionUser();
  const canManage = user.role === "admin" || user.role === "qe";
  const canSeeAll = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const [editing, setEditing] = useState<KpiView | null>(); // undefined = closed, null = add
  const [deleting, setDeleting] = useState<KpiView | null>(null);
  const [delPending, startDelete] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<KpiStatus | "all">("all");
  const [showAllChart, setShowAllChart] = useState(false);

  const count = (s: string) => kpis.filter((k) => k.result.status === s).length;

  const filteredKpis = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return kpis.filter((k) => {
      if (deptFilter !== "all" && k.departmentId !== deptFilter) return false;
      if (statusFilter !== "all" && k.result.status !== statusFilter) return false;
      if (q) {
        const text = `${k.name} ${k.description ?? ""} ${k.standardLabel} ${departmentName(k.departmentId, lang)} ${k.period}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [kpis, deferredSearch, deptFilter, statusFilter, lang]);

  const hasActiveFilters = searchQuery.trim() !== "" || deptFilter !== "all" || statusFilter !== "all";
  const chartKpis = showAllChart ? filteredKpis : filteredKpis.slice(0, 10);

  const columns: Column<KpiView>[] = [
    {
      key: "name",
      header: t.kpi.name,
      render: (k) => {
        const by = getUserById(k.updatedBy);
        return (
          <>
            <p className="font-semibold">{k.name}</p>
            {k.description && <p className="text-xs text-text-muted">{k.description}</p>}
            <p className="text-xs text-text-muted">
              {departmentName(k.departmentId, lang)}
              {k.standardLabel && ` · ${k.standardLabel}`} · {formatMonth(k.period, lang)}
            </p>
            {canSeeAll && (
              <p className="text-[11px] text-text-muted">
                {t.kpi.updated.replace("{date}", formatDateTime(k.updatedAt, lang)).replace("{name}", by ? displayName(by, lang) : "-")}
              </p>
            )}
          </>
        );
      },
    },
    {
      key: "target",
      header: t.kpi.target,
      className: "text-right whitespace-nowrap tabular-nums",
      render: (k) => (
        <>
          <p className="font-semibold">{fmt(k.target, k.unit)}</p>
          <p className="text-[11px] text-text-muted">{k.direction === "higher" ? "≥" : "≤"}</p>
        </>
      ),
    },
    {
      key: "actual",
      header: t.kpi.actual,
      className: "text-right whitespace-nowrap tabular-nums font-bold",
      render: (k) => fmt(k.actual, k.unit),
    },
    {
      key: "variance",
      header: t.kpi.variance,
      className: "text-right whitespace-nowrap tabular-nums",
      render: (k) => (
        <span className={cn(k.result.status === "not_achieved" && "font-semibold text-danger")}>
          {k.result.variance === null ? "–" : `${k.result.variance > 0 ? "+" : ""}${fmt(k.result.variance)}`}
        </span>
      ),
    },
    {
      key: "achievement",
      header: t.kpi.achievement,
      className: "text-right whitespace-nowrap tabular-nums",
      render: (k) => (k.result.achievement === null ? "–" : `${k.result.achievement}%`),
    },
    {
      key: "result",
      header: t.kpi.result,
      render: (k) => (
        <div className="space-y-1.5">
          <KpiBullet kpi={k} />
          <KpiStatusBadge status={k.result.status} />
        </div>
      ),
    },
    ...(canManage
      ? [
          {
            key: "edit",
            header: "",
            className: "w-px text-right",
            render: (k: KpiView) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(k)}
                  className="rounded-control p-2 text-text-muted hover:bg-page hover:text-primary"
                  aria-label={`${t.common.edit} ${k.name}`}
                  title={t.common.edit}
                >
                  <EditIcon width={18} height={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(k)}
                  className="rounded-control p-2 text-text-muted hover:bg-danger-soft hover:text-danger"
                  aria-label={`${t.common.delete} ${k.name}`}
                  title={t.common.delete}
                >
                  <TrashIcon width={18} height={18} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title={t.nav.kpi}
        description={
          canSeeAll ? t.pages.kpi : `${t.pages.kpi} · ${departmentName(user.departmentId, lang)}`
        }
        actions={
          canManage && (
            <Button onClick={() => setEditing(null)}>
              <PlusIcon width={18} height={18} />
              {t.kpi.add}
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t.kpi.total} value={String(kpis.length)} icon="Σ" />
        <StatTile label={t.kpiStatus.achieved} value={String(count("achieved"))} icon="✓" accent="success" />
        <StatTile label={t.kpiStatus.not_achieved} value={String(count("not_achieved"))} icon="✗" accent="danger" />
        <StatTile label={t.kpiStatus.no_data} value={String(count("no_data"))} icon="–" accent="neutral" />
      </div>

      {filteredKpis.length > 0 && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{t.kpi.achievementChart}</CardTitle>
            {filteredKpis.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllChart((v) => !v)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                {showAllChart ? "แสดงเฉพาะ 10 รายการแรก" : `ดูทั้งหมด (${filteredKpis.length} รายการ)`}
              </button>
            )}
          </div>
          <p className="mb-4 text-xs text-text-muted">{t.kpi.achievementNote}</p>
          <KpiCards kpis={chartKpis} />
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 border-b border-border/60 pb-3">
          <label className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <span className="sr-only">{t.common.search}</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" width={15} height={15} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ KPI, รายละเอียด, มาตรฐาน, แผนก..."
              className="h-9 w-full rounded-lg border border-border/80 bg-surface pl-8 pr-3 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden transition-colors"
            />
          </label>

          <select
            aria-label={t.kpi.result}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as KpiStatus | "all")}
            className="h-9 rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text transition-colors hover:border-primary/40 focus:border-primary focus:outline-hidden cursor-pointer"
          >
            <option value="all">ทุกสถานะ ({kpis.length})</option>
            <option value="achieved">✓ {t.kpiStatus.achieved} ({count("achieved")})</option>
            <option value="not_achieved">✗ {t.kpiStatus.not_achieved} ({count("not_achieved")})</option>
            <option value="no_data">– {t.kpiStatus.no_data} ({count("no_data")})</option>
          </select>

          {canSeeAll && (
            <select
              aria-label={t.checklist.department}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 sm:min-w-[190px] rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text transition-colors hover:border-primary/40 focus:border-primary focus:outline-hidden cursor-pointer"
            >
              <option value="all">🏢 {t.dashboard.all} ({kpis.length})</option>
              {departments.map((d) => {
                const deptCount = kpis.filter((k) => k.departmentId === d.id).length;
                return (
                  <option key={d.id} value={d.id}>
                    {departmentName(d.id, lang)} ({deptCount})
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
                setStatusFilter("all");
              }}
              className="rounded-lg border border-border/80 bg-page px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft transition-colors cursor-pointer shrink-0"
            >
              ✕ ล้างตัวกรอง
            </button>
          )}
        </div>

        <p className="mb-4 text-xs text-text-muted">{t.kpi.chartNote}</p>
        <DataTable
          columns={columns}
          rows={filteredKpis}
          rowKey={(k) => k.id}
          emptyTitle={hasActiveFilters ? "ไม่พบ KPI ที่ตรงกับตัวกรอง" : canSeeAll ? t.kpi.empty : t.kpi.emptyEmployee}
        />
      </Card>

      {editing !== undefined && (
        <KpiFormModal
          kpi={editing ?? undefined}
          standards={standards}
          defaultPeriod={defaultPeriod}
          onClose={() => setEditing(undefined)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={t.kpi.deleteTitle}
        message={t.kpi.deleteMessage.replace("{name}", deleting?.name ?? "")}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={delPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          startDelete(async () => {
            const res = await deleteKpi(deleting.id);
            setDeleting(null);
            if (!res.ok) {
              if (res.error) toast.error(t.errors[res.error]);
              return;
            }
            toast.success(t.kpi.deleted);
          });
        }}
      />
    </>
  );
}
