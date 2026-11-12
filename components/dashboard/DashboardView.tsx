"use client";

import { useRef, useState } from "react";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { departments } from "@/data/departments";
import { groupSummaries, summarize, type InspectionItem } from "@/lib/dashboard";
import type { Overview } from "@/lib/dashboard/queries";
import { departmentName } from "@/lib/format";
import { displayName } from "@/lib/user";
import { useActiveDepartment } from "@/lib/useActiveDepartment";
import { InspectionResults, type ResultTab } from "./InspectionResults";
import { OverviewCards } from "./OverviewCards";
import { formatPercent, ResultsBarChart, type ChartRow } from "./ResultsBarChart";
import { StatTile } from "./StatTile";

/**
 * Dashboard for both roles.
 * - Admin / QE / ISO: can view all departments or filter by specific department.
 * - Employee: own department only (data is already scoped on the server).
 */
export function DashboardView({ items, overview }: { items: InspectionItem[]; overview: Overview }) {
  const { lang, t } = useI18n();
  const user = useSessionUser();
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const [tab, setTab] = useState<ResultTab>("all");
  const [selectedDept, setSelectedDept] = useActiveDepartment(isPrivileged ? undefined : user.departmentId);
  const listRef = useRef<HTMLDivElement>(null);

  const activeItems = selectedDept === "all" ? items : items.filter((i) => i.departmentId === selectedDept);
  const total = summarize(activeItems);

  const byStandard: ChartRow[] = groupSummaries(activeItems, (i) => i.standardId).map((g) => ({
    key: g.key,
    label: items.find((i) => i.standardId === g.key)?.standardLabel ?? g.key,
    summary: g.summary,
  }));
  const byDepartment: ChartRow[] = departments
    .map((d) => {
      const deptItems = items.filter((i) => i.departmentId === d.id);
      return {
        key: d.id,
        label: departmentName(d.id, lang),
        summary: summarize(deptItems),
      };
    })
    .sort((a, b) => b.summary.total - a.summary.total || a.label.localeCompare(b.label));

  const openList = (next: ResultTab) => {
    setTab(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const roleTone: Record<string, "primary" | "warning" | "success"> = {
    admin: "primary",
    qe: "primary",
    iso: "warning",
    employee: "success",
  };

  return (
    <>
      <PageHeader
        title={isPrivileged ? t.dashboard.adminTitle : t.dashboard.employeeTitle}
        description={
          isPrivileged
            ? t.dashboard.adminDesc
            : t.dashboard.employeeDesc.replace("{dept}", departmentName(user.departmentId, lang))
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-text-muted">{t.dashboard.welcome},</span>
            <span className="font-bold">{displayName(user, lang)}</span>
            <Badge tone="neutral">🏢 {departmentName(user.departmentId, lang)}</Badge>
            <Badge tone={roleTone[user.role] ?? "primary"}>{t.roles[user.role]}</Badge>
          </div>
        }
      />

      {/* Department filter (privileged roles only) */}
      {isPrivileged && (
        <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2.5 sm:gap-3 rounded-card border border-border bg-surface px-3.5 py-3 sm:px-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <label htmlFor="dashboard-dept-select" className="text-xs font-bold text-text-muted shrink-0">
              🏢 {t.checklist.department}:
            </label>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                id="dashboard-dept-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-9 flex-1 sm:flex-none sm:min-w-[220px] rounded-lg border border-border/80 bg-page/60 px-3 text-xs font-semibold text-text transition-colors hover:border-primary/40 focus:border-primary focus:bg-surface focus:outline-hidden cursor-pointer"
              >
                <option value="all">
                  {t.dashboard.all} ({items.length})
                </option>
                {departments.map((d) => {
                  const count = items.filter((i) => i.departmentId === d.id).length;
                  return (
                    <option key={d.id} value={d.id}>
                      {departmentName(d.id, lang)} ({count})
                    </option>
                  );
                })}
              </select>

              {selectedDept !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedDept("all")}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/80 bg-page px-2.5 py-1.5 text-xs font-semibold text-text-muted hover:border-danger/40 hover:bg-danger-soft hover:text-danger transition-colors cursor-pointer"
                >
                  <span>✕ ล้างตัวกรอง</span>
                </button>
              )}
            </div>
          </div>

          <span className="text-xs text-text-muted">
            {selectedDept === "all" ? (
              <>แสดงข้อมูลรวมทั้ง <strong>{departments.length}</strong> แผนก</>
            ) : (
              <>กำลังดูเฉพาะ: <strong className="text-primary">{departmentName(selectedDept, lang)}</strong> ({activeItems.length} รายการ)</>
            )}
          </span>
        </div>
      )}

      {/* Summary KPI Tiles */}
      <div className="mb-5 sm:mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <StatTile
          hero
          className="col-span-2 xl:col-span-1"
          label={t.dashboard.compliance}
          value={formatPercent(total.compliance)}
          note={`${t.dashboard.complianceNote} · ${t.dashboard.checkedOf
            .replace("{checked}", String(total.checked))
            .replace("{total}", String(total.total))}`}
          icon="%"
        />
        <StatTile
          label={t.dashboard.totalItems}
          value={String(total.total)}
          icon="Σ"
          active={tab === "all"}
          onClick={() => openList("all")}
          note={t.dashboard.clickToView}
        />
        <StatTile
          label={t.dashboard.passed}
          value={String(total.passed)}
          icon="✓"
          accent="success"
          active={tab === "pass"}
          onClick={() => openList("pass")}
          note={t.dashboard.clickToView}
        />
        <StatTile
          label={t.dashboard.failed}
          value={String(total.failed)}
          icon="✗"
          accent="danger"
          active={tab === "fail"}
          onClick={() => openList("fail")}
          note={t.dashboard.clickToView}
        />
        <StatTile
          label={t.dashboard.notChecked}
          value={String(total.notChecked)}
          icon="–"
          accent="neutral"
          active={tab === "not_checked"}
          onClick={() => openList("not_checked")}
          note={t.dashboard.clickToView}
        />
      </div>

      <OverviewCards overview={overview} />

      <div className={isPrivileged ? "mb-6 grid gap-6 lg:grid-cols-2" : "mb-6"}>
        <Card>
          <CardTitle>{isPrivileged ? t.dashboard.byStandard : t.dashboard.passRateByStandard}</CardTitle>
          <p className="mb-4 text-xs text-text-muted">{t.dashboard.chartNote}</p>
          <ResultsBarChart rows={byStandard} groupLabel={t.requirements.standard} pageSize={8} />
        </Card>
        {isPrivileged && (
          <Card>
            <CardTitle>{t.dashboard.byDepartment}</CardTitle>
            <p className="mb-4 text-xs text-text-muted">{t.dashboard.chartNote}</p>
            <ResultsBarChart
              rows={byDepartment}
              groupLabel={t.checklist.department}
              pageSize={8}
              selectedKey={selectedDept}
              onRowClick={(row) => {
                setSelectedDept(row.key);
                listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          </Card>
        )}
      </div>

      <Card>
        <CardTitle className="mb-4">{t.dashboard.results}</CardTitle>
        <InspectionResults
          ref={listRef}
          items={isPrivileged ? items : activeItems}
          tab={tab}
          onTabChange={setTab}
          department={isPrivileged ? selectedDept : undefined}
          onDepartmentChange={isPrivileged ? setSelectedDept : undefined}
        />
      </Card>
    </>
  );
}
