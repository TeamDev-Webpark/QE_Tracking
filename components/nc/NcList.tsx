"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Button, Card, DataTable, PageHeader, Tooltip, type BadgeTone, type Column } from "@/components/ui";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { departments } from "@/data/departments";
import { getUserById } from "@/data";
import { departmentName } from "@/lib/format";
import { NC_DISPLAY_STATUSES, type NcDisplayStatus } from "@/lib/nc";
import type { FailedCandidate, NcRequirementOption, NcView, StandardOption } from "@/lib/nc/queries";
import { displayName } from "@/lib/user";
import { cn } from "@/lib/cn";
import { NcCreateDialog, NcFromChecklistDialog } from "./NcCreateDialogs";
import { daysBetween, formatDateOnly, NcStatusBadge } from "./NcParts";

type Tab = NcDisplayStatus | "all";

const statusTones: Record<NcDisplayStatus, BadgeTone> = {
  open: "info",
  in_progress: "warning",
  overdue: "danger",
  pending_verification: "purple",
  closed: "success",
};

export function NcList({
  items,
  candidates,
  standards,
  requirements = [],
  today,
  initialTab,
}: {
  items: NcView[];
  candidates: FailedCandidate[];
  standards: StandardOption[];
  requirements?: NcRequirementOption[];
  today: string;
  initialTab?: NcDisplayStatus;
}) {
  const { lang, t } = useI18n();
  const role = useSessionUser().role;
  const canAudit = role === "admin" || role === "iso" || role === "qe";
  const [tab, setTab] = useState<Tab>(initialTab ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [standardFilter, setStandardFilter] = useState<string>("all");
  const [dialog, setDialog] = useState<"manual" | "checklist">();

  const deptItems = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return items.filter((i) => {
      if (deptFilter !== "all" && i.departmentId !== deptFilter) return false;
      if (standardFilter !== "all" && i.standardId !== standardFilter) return false;
      if (q) {
        const text = `${i.number} ${i.car?.number ?? ""} ${i.title} ${i.description ?? ""} ${i.clause ?? ""} ${i.standardLabel} ${departmentName(i.departmentId, lang)}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [items, deferredSearch, deptFilter, standardFilter, lang]);

  const count = (s: Tab) => (s === "all" ? deptItems.length : deptItems.filter((i) => i.displayStatus === s).length);
  const rows = useMemo(
    () => (tab === "all" ? deptItems : deptItems.filter((i) => i.displayStatus === tab)),
    [deptItems, tab],
  );
  const hasActiveFilters = searchQuery.trim() !== "" || deptFilter !== "all" || standardFilter !== "all";

  const columns: Column<NcView>[] = [
    {
      key: "number",
      header: t.nc.number,
      className: "w-36",
      render: (n) => (
        <>
          <p className="font-bold whitespace-nowrap">{n.number}</p>
          <p className="text-xs whitespace-nowrap text-text-muted">
            {n.standardLabel}
            {n.clause && ` · ${n.clause}`}
          </p>
        </>
      ),
    },
    {
      key: "title",
      header: t.nc.title,
      render: (n) => (
        <>
          <p className="font-semibold">{n.title}</p>
          <p className="text-xs text-text-muted">
            {departmentName(n.departmentId, lang)} · {n.source === "checklist" ? t.nc.sourceChecklist : t.nc.sourceManual}
          </p>
        </>
      ),
    },
    {
      key: "car",
      header: `${t.nc.car} / ${t.nc.dueDate}`,
      render: (n) => {
        if (!n.car) return <span className="text-sm text-text-muted">{t.nc.noCar}</span>;
        const owner = getUserById(n.car.ownerId);
        return (
          <div className="text-sm whitespace-nowrap">
            <p className="font-semibold">{n.car.number}</p>
            <p className="text-xs text-text-muted">{owner ? displayName(owner, lang) : "-"}</p>
            <p className={cn("text-xs", n.displayStatus === "overdue" ? "font-bold text-danger" : "text-text-muted")}>
              {formatDateOnly(n.car.dueDate, lang)}
              {n.displayStatus === "overdue" &&
                ` · ${t.nc.overdueBy.replace("{n}", String(daysBetween(n.car.dueDate, today)))}`}
            </p>
          </div>
        );
      },
    },
    { key: "status", header: t.nc.status, render: (n) => <NcStatusBadge status={n.displayStatus} /> },
    {
      key: "view",
      header: "",
      className: "w-px text-right",
      render: (n) => (
        <Link
          href={`/corrective-actions/${n.id}`}
          className="inline-flex h-9 items-center rounded-control border border-border px-3 text-sm font-semibold whitespace-nowrap hover:bg-page"
        >
          {t.nc.view}
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.correctiveActions}
        description={t.pages.correctiveActions}
        actions={
          canAudit && (
            <>
              <Button variant="secondary" onClick={() => setDialog("checklist")}>
                {t.nc.fromChecklist} ({candidates.length})
              </Button>
              <Button onClick={() => setDialog("manual")}>
                <PlusIcon width={18} height={18} />
                {t.nc.create}
              </Button>
            </>
          )
        }
      />

      <Card>
        <div className="mb-4 space-y-3 border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label={t.nc.status} className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-page/70 p-1">
              {(["all", ...NC_DISPLAY_STATUSES] as Tab[]).map((s) => (
                <Tooltip
                  key={s}
                  content={s === "all" ? undefined : t.ncStatusTooltip[s]}
                  tone={s === "all" ? undefined : statusTones[s]}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === s}
                    onClick={() => setTab(s)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                      tab === s ? "bg-primary text-white shadow-xs" : "text-text-muted hover:text-text",
                    )}
                  >
                    {s === "all" ? t.nc.all : t.ncStatus[s]} <span className="ml-0.5 opacity-80">({count(s)})</span>
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5">
            <label className="relative flex-1 min-w-0 sm:min-w-[220px]">
              <span className="sr-only">{t.common.search}</span>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" width={15} height={15} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขที่ NC, CAR, หัวข้อปัญหา, ข้อกำหนด, แผนก..."
                className="h-9 w-full rounded-lg border border-border/80 bg-surface pl-8 pr-3 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden transition-colors"
              />
            </label>

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

            {canAudit && (
              <select
                id="nc-dept-select"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-9 sm:min-w-[200px] rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text transition-colors hover:border-primary/40 focus:border-primary focus:outline-hidden cursor-pointer"
              >
                <option value="all">
                  🏢 {t.dashboard.all} ({items.length})
                </option>
                {departments.map((d) => {
                  const deptCount = items.filter((i) => i.departmentId === d.id).length;
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
                  setStandardFilter("all");
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
          rowKey={(n) => n.id}
          emptyTitle={items.length === 0 ? (canAudit ? t.nc.empty : t.nc.emptyEmployee) : t.nc.noMatch}
        />
      </Card>

      {dialog === "manual" && (
        <NcCreateDialog standards={standards} requirements={requirements} onClose={() => setDialog(undefined)} />
      )}
      {dialog === "checklist" && <NcFromChecklistDialog candidates={candidates} onClose={() => setDialog(undefined)} />}
    </>
  );
}
