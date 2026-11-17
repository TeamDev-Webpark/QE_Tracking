"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { Button, Card, ConfirmDialog, DataTable, Modal, PageHeader, useToast, type Column } from "@/components/ui";
import { EditIcon, HistoryIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { StatTile } from "@/components/dashboard/StatTile";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { getUserById } from "@/data";
import { departments } from "@/data/departments";
import { departmentName, formatDateTime } from "@/lib/format";
import { deleteKpi } from "@/lib/kpi/actions";
import { evaluateKpi, type KpiStatus } from "@/lib/kpi";
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
  const [viewingHistory, setViewingHistory] = useState<KpiView | null>(null);
  const [deleting, setDeleting] = useState<KpiView | null>(null);
  const [delPending, startDelete] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<KpiStatus | "all">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

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

  const columns: Column<KpiView>[] = [
    {
      key: "name",
      header: t.kpi.name,
      render: (k) => {
        const by = getUserById(k.updatedBy);
        return (
          <>
            <button
              type="button"
              onClick={() => setViewingHistory(k)}
              className="text-left font-semibold text-text hover:text-primary hover:underline transition-colors cursor-pointer"
            >
              {k.name}
            </button>
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
    {
      key: "edit",
      header: "",
      className: "w-px text-right",
      render: (k: KpiView) => (
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setViewingHistory(k)}
            className="inline-flex items-center gap-1 rounded-control border border-border bg-page px-2.5 py-1.5 text-xs font-semibold text-text hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
            title="ดูประวัติรายเดือนย้อนหลัง"
          >
            <HistoryIcon width={14} height={14} />
            <span>ประวัติ ({k.history?.length ?? 1})</span>
          </button>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setEditing(k)}
                className="rounded-control p-2 text-text-muted hover:bg-page hover:text-primary cursor-pointer"
                aria-label={`${t.common.edit} ${k.name}`}
                title={t.common.edit}
              >
                <EditIcon width={18} height={18} />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(k)}
                className="rounded-control p-2 text-text-muted hover:bg-danger-soft hover:text-danger cursor-pointer"
                aria-label={`${t.common.delete} ${k.name}`}
                title={t.common.delete}
              >
                <TrashIcon width={18} height={18} />
              </button>
            </>
          )}
        </div>
      ),
    },
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

          <div className="inline-flex rounded-lg border border-border/80 bg-page p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer",
                viewMode === "table" ? "bg-surface text-primary shadow-2xs" : "text-text-muted hover:text-text",
              )}
            >
              ตาราง
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={cn(
                "rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer",
                viewMode === "cards" ? "bg-surface text-primary shadow-2xs" : "text-text-muted hover:text-text",
              )}
            >
              การ์ด
            </button>
          </div>
        </div>

        {viewMode === "cards" ? (
          <KpiCards kpis={filteredKpis} onViewHistory={(k) => setViewingHistory(k)} />
        ) : (
          <DataTable
            columns={columns}
            rows={filteredKpis}
            rowKey={(k) => k.id}
            emptyTitle={hasActiveFilters ? "ไม่พบ KPI ที่ตรงกับตัวกรอง" : canSeeAll ? t.kpi.empty : t.kpi.emptyEmployee}
          />
        )}
      </Card>

      {viewingHistory && (
        <Modal
          open
          size="lg"
          onClose={() => setViewingHistory(null)}
          closeLabel={t.common.close}
          title={`ประวัติ KPI รายเดือน · ${viewingHistory.name}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setViewingHistory(null)}>
                {t.common.close}
              </Button>
              {canManage && (
                <Button
                  onClick={() => {
                    const target = viewingHistory;
                    setViewingHistory(null);
                    setEditing(target);
                  }}
                >
                  บันทึก / แก้ไขผลรายเดือน
                </Button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-control border border-border bg-page p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-text">
                    {departmentName(viewingHistory.departmentId, lang)}
                  </span>
                  {viewingHistory.standardLabel && (
                    <span className="text-text-muted"> · มาตรฐาน {viewingHistory.standardLabel}</span>
                  )}
                </div>
                <span className="rounded bg-surface px-2.5 py-1 font-bold text-text tabular-nums">
                  เป้าหมาย: {viewingHistory.direction === "higher" ? "≥" : "≤"}{" "}
                  {fmt(viewingHistory.target, viewingHistory.unit)}
                </span>
              </div>
              {viewingHistory.description && (
                <p className="mt-1.5 text-text-muted">{viewingHistory.description}</p>
              )}
            </div>

            <div className="divide-y divide-border/70 rounded-control border border-border bg-surface">
              <div className="hidden sm:grid sm:grid-cols-[1.4fr_0.8fr_1fr_auto] sm:items-center sm:gap-3 bg-page px-4 py-2.5 text-xs font-semibold text-text-muted">
                <span>เดือนที่วัดผล</span>
                <span className="text-right">เป้าหมาย</span>
                <span className="text-right">ผลจริง (ส่วนต่าง)</span>
                <span className="w-[8.5rem] text-right">ผลการประเมิน</span>
              </div>
              {[...(viewingHistory.history ?? [])]
                .sort((a, b) => b.period.localeCompare(a.period))
                .map((h) => {
                  const evalRes = evaluateKpi({
                    direction: viewingHistory.direction,
                    target: h.target,
                    actual: h.actual,
                  });
                  const byUser = getUserById(h.updatedBy);
                  const varianceText =
                    evalRes.variance === null
                      ? null
                      : `${evalRes.variance > 0 ? "+" : ""}${fmt(evalRes.variance)}`;
                  return (
                    <div
                      key={h.period}
                      className="flex flex-col gap-2 px-4 py-3 text-xs hover:bg-page/40 sm:grid sm:grid-cols-[1.4fr_0.8fr_1fr_auto] sm:items-center sm:gap-3"
                    >
                      <div className="flex items-center justify-between gap-2 sm:block min-w-0">
                        <p className="font-bold text-text">
                          {formatMonth(h.period, lang)}{" "}
                          <span className="font-normal text-text-muted">({h.period})</span>
                        </p>
                        <div className="sm:hidden">
                          <KpiStatusBadge status={evalRes.status} />
                        </div>
                        <p className="hidden sm:block mt-0.5 truncate text-[11px] text-text-muted">
                          {formatDateTime(h.updatedAt, lang)}
                          {byUser ? ` · ${displayName(byUser, lang)}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 sm:block sm:text-right tabular-nums">
                        <span className="text-text-muted sm:hidden">
                          เป้า {viewingHistory.direction === "higher" ? "≥" : "≤"}{" "}
                          {fmt(h.target, viewingHistory.unit)}
                        </span>
                        <span className="hidden sm:inline text-text-muted">
                          {viewingHistory.direction === "higher" ? "≥" : "≤"}{" "}
                          {fmt(h.target, viewingHistory.unit)}
                        </span>
                        <span className="sm:hidden font-bold text-text">
                          ผลจริง: {fmt(h.actual, viewingHistory.unit)}{" "}
                          {varianceText && (
                            <span
                              className={cn(
                                "ml-1 font-semibold",
                                evalRes.status === "not_achieved" ? "text-danger" : "text-emerald-700",
                              )}
                            >
                              ({varianceText})
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="hidden sm:block text-right tabular-nums">
                        <span className="font-bold text-text">{fmt(h.actual, viewingHistory.unit)}</span>
                        {varianceText && (
                          <span
                            className={cn(
                              "ml-1.5 text-[11px] font-semibold",
                              evalRes.status === "not_achieved" ? "text-danger" : "text-emerald-700",
                            )}
                          >
                            ({varianceText})
                          </span>
                        )}
                      </div>

                      <div className="hidden sm:flex sm:w-[8.5rem] sm:justify-end">
                        <KpiStatusBadge status={evalRes.status} />
                      </div>

                      <p className="sm:hidden text-[11px] text-text-muted">
                        อัปเดต {formatDateTime(h.updatedAt, lang)}
                        {byUser ? ` · ${displayName(byUser, lang)}` : ""}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        </Modal>
      )}

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
