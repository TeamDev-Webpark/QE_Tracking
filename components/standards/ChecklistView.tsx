"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Card, ConfirmDialog, DataTable, PageHeader, type Column, useToast } from "@/components/ui";
import { ArrowLeftIcon, ClipboardCheckIcon, EditIcon, HistoryIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { InspectionDetailModal } from "@/components/dashboard/InspectionDetailModal";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { getUserById } from "@/data";
import { departments } from "@/data/departments";
import { formatCriteria } from "@/lib/checklist";
import { departmentName, formatDateTime } from "@/lib/format";
import { deleteChecklist, type ActionResult } from "@/lib/standards/actions";
import type { RequirementClauseOption } from "@/lib/standards/queries";
import type { ChecklistItem, IsoStandard } from "@/lib/types";
import { displayName } from "@/lib/user";
import { useActiveDepartment } from "@/lib/useActiveDepartment";
import { ChecklistFormModal } from "./ChecklistFormModal";
import { RecordResultModal } from "./RecordResultModal";
import { ResultBadge } from "./ResultBadge";

const iconButton = "rounded-control p-2 text-text-muted transition-colors hover:bg-page";

export function ChecklistView({
  standard,
  checklists,
  requirements = [],
}: {
  standard: IsoStandard;
  checklists: ChecklistItem[];
  requirements?: RequirementClauseOption[];
}) {
  const { lang, t } = useI18n();
  const toast = useToast();
  const user = useSessionUser();
  const role = user.role;
  const isPrivileged = role === "admin" || role === "qe" || role === "iso";
  const canManage = role === "admin" || role === "qe";
  const canRecord = role === "admin" || role === "qe" || role === "iso";

  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const editId = searchParams.get("edit");
  const recordId = searchParams.get("record");
  const paramDept = searchParams.get("dept");

  const targetId = highlightId || editId || recordId;

  // Smooth scroll and focus on target row from dashboard
  useEffect(() => {
    if (!targetId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`checklist-row-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [targetId]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<"all" | "pass" | "fail" | "not_checked">("all");
  const initialDeptOverride = useMemo(() => {
    if (!isPrivileged) return "all"; // Server already filtered to employee's own department
    if (paramDept && paramDept !== "all") return paramDept;
    if (targetId) {
      const target = checklists.find((c) => c.id === targetId);
      if (target) return target.departmentId;
    }
    return undefined;
  }, [isPrivileged, paramDept, targetId, checklists]);

  const [storedDept, setStoredDept] = useActiveDepartment(initialDeptOverride);
  const [localDeptOverride, setLocalDeptOverride] = useState<string | null>(null);
  const deptFilter = localDeptOverride ?? storedDept;

  const [typeFilter, setTypeFilter] = useState<"all" | "pass_fail" | "numeric">("all");

  const handleDeptFilterChange = (nextDept: string) => {
    setLocalDeptOverride(nextDept);
    setStoredDept(nextDept);
  };

  const getItemStatus = (c: ChecklistItem): "pass" | "fail" | "not_checked" => {
    const latest = c.results[0];
    if (!latest) return "not_checked";
    return latest.passed ? "pass" : "fail";
  };

  const counts = useMemo(() => {
    let pass = 0;
    let fail = 0;
    let not_checked = 0;
    for (const c of checklists) {
      const s = getItemStatus(c);
      if (s === "pass") pass++;
      else if (s === "fail") fail++;
      else not_checked++;
    }
    return { all: checklists.length, pass, fail, not_checked };
  }, [checklists]);

  // All 16 departments in the dropdown
  const deptDropdownOptions = useMemo(() => {
    return departments.map((d) => d.id);
  }, []);

  const reqByChecklist = useMemo(() => {
    const map = new Map<string, RequirementClauseOption>();
    for (const c of checklists) {
      const match =
        requirements.find((r) => r.checklistIds.includes(c.id)) ??
        requirements.find((r) => r.number === c.clause && r.departmentId === c.departmentId) ??
        requirements.find((r) => r.number === c.clause);
      if (match) map.set(c.id, match);
    }
    return map;
  }, [checklists, requirements]);

  const filteredChecklists = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return checklists.filter((c) => {
      // 1. Search filter (title, clause, requirement name, department)
      if (q) {
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchClause = c.clause.toLowerCase().includes(q);
        const matchReqName = reqByChecklist.get(c.id)?.name.toLowerCase().includes(q) ?? false;
        const matchDept = departmentName(c.departmentId, lang).toLowerCase().includes(q);
        if (!matchTitle && !matchClause && !matchReqName && !matchDept) return false;
      }
      // 2. Status filter
      if (statusFilter !== "all") {
        const status = getItemStatus(c);
        if (status !== statusFilter) return false;
      }
      // 3. Department filter
      if (deptFilter !== "all" && c.departmentId !== deptFilter) {
        return false;
      }
      // 4. Type filter
      if (typeFilter !== "all" && c.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [checklists, deferredSearch, statusFilter, deptFilter, typeFilter, lang, reqByChecklist]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || deptFilter !== "all" || typeFilter !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    handleDeptFilterChange("all");
    setTypeFilter("all");
    if (typeof window !== "undefined") {
      localStorage.setItem("iso_active_department", "all");
    }
  };

  // undefined = closed, null = add new
  const [editing, setEditing] = useState<ChecklistItem | null | undefined>(undefined);
  const [recording, setRecording] = useState<ChecklistItem | undefined>(undefined);
  const [historyItem, setHistoryItem] = useState<ChecklistItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<ChecklistItem>();
  const [deleteError, setDeleteError] = useState<ActionResult>();
  const [deletePending, startDelete] = useTransition();

  const confirmDelete = () => {
    if (!deleting) return;
    startDelete(async () => {
      const res = await deleteChecklist(deleting.id);
      setDeleting(undefined);
      setDeleteError(res.ok ? undefined : res);
      if (res.ok) toast.success(t.checklist.deleted);
      else if (res.error) toast.error(t.errors[res.error]);
    });
  };

  const columns: Column<ChecklistItem>[] = [
    {
      key: "clause",
      header: t.checklist.clause,
      className: "w-44 sm:w-52",
      render: (c) => {
        const req = reqByChecklist.get(c.id);
        return (
          <div className="max-w-[170px] sm:max-w-[200px]">
            <span className="inline-block rounded bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
              {c.clause}
            </span>
            {req && (
              <p className="mt-1 truncate text-xs text-text-muted" title={`${req.number} · ${req.name}`}>
                {req.name}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "item",
      header: t.checklist.item,
      render: (c) => (
        <>
          <p className="font-semibold text-text">{c.title}</p>
          <p className="text-xs text-text-muted mt-0.5">{departmentName(c.departmentId, lang)}</p>
        </>
      ),
    },
    {
      key: "criteria",
      header: t.checklist.criteria,
      render: (c) => (
        <>
          <p className="text-xs text-text-muted">
            {c.type === "pass_fail" ? t.checklist.typePassFail : t.checklist.typeNumeric}
          </p>
          {c.criteria && <p className="font-semibold whitespace-nowrap">{formatCriteria(c.criteria)}</p>}
        </>
      ),
    },
    {
      key: "actualValue",
      header: t.checklist.actualValue,
      render: (c) => {
        const r = c.results[0];
        if (!r) return <span className="text-text-muted">–</span>;
        if (typeof r.value === "number") {
          return (
            <span className="font-bold tabular-nums whitespace-nowrap text-text">
              {r.value.toLocaleString("en-US")} {c.criteria?.unit}
            </span>
          );
        }
        return (
          <span className="font-medium text-xs whitespace-nowrap text-text">
            {r.value ? t.checklist.pass : t.checklist.fail}
          </span>
        );
      },
    },
    {
      key: "result",
      header: t.checklist.lastResult,
      render: (c) => {
        const r = c.results[0];
        if (!r) return <ResultBadge />;
        const by = getUserById(r.checkedBy);
        return (
          <div className="space-y-1">
            <ResultBadge passed={r.passed} />
            <p className="text-xs whitespace-nowrap text-text-muted">
              {formatDateTime(r.checkedAt, lang)}
              {by && ` · ${displayName(by, lang)}`}
            </p>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: t.common.actions,
      className: "w-px text-right",
      render: (c: ChecklistItem) => (
        <div className="flex items-center justify-end gap-1">
          {c.results.length > 0 && (
            <button
              type="button"
              onClick={() => setHistoryItem(c)}
              className={`${iconButton} hover:text-primary`}
              aria-label={`${t.checklist.history} ${c.clause}`}
              title={`${t.checklist.history} (${c.results.length})`}
            >
              <HistoryIcon width={18} height={18} />
            </button>
          )}
          {canRecord && (
            <Button size="sm" variant="secondary" onClick={() => setRecording(c)} className="whitespace-nowrap">
              <ClipboardCheckIcon width={16} height={16} />
              {t.checklist.record}
            </Button>
          )}
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setEditing(c)}
                className={`${iconButton} hover:text-primary`}
                aria-label={`${t.common.edit} ${c.clause}`}
                title={t.common.edit}
              >
                <EditIcon width={18} height={18} />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(c)}
                className={`${iconButton} hover:text-danger`}
                aria-label={`${t.common.delete} ${c.clause}`}
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
      <Link href="/standards" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeftIcon width={16} height={16} />
        {t.nav.standards}
      </Link>

      <PageHeader
        title={`${standard.code}:${standard.version}`}
        description={standard.name}
        actions={
          canManage && (
            <Button onClick={() => setEditing(null)}>
              <PlusIcon width={18} height={18} />
              {t.checklist.add}
            </Button>
          )
        }
      />

      {deleteError && !deleteError.ok && deleteError.error && (
        <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {t.errors[deleteError.error]}
        </p>
      )}

      <Card>
        {/* Header with Title, Counts, and Status Filter Tabs */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{t.checklist.title}</h2>
            <Badge tone="primary">
              {filteredChecklists.length}
              {filteredChecklists.length !== checklists.length && ` จาก ${checklists.length}`}
            </Badge>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-page/70 p-1">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "all" ? "bg-surface text-primary shadow-xs" : "text-text-muted hover:text-text"
              }`}
            >
              {t.dashboard.all} ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pass")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "pass" ? "bg-success text-white shadow-xs" : "text-text-muted hover:text-success"
              }`}
            >
              ✓ {t.checklist.pass} ({counts.pass})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("fail")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "fail" ? "bg-danger text-white shadow-xs" : "text-text-muted hover:text-danger"
              }`}
            >
              ✗ {t.checklist.fail} ({counts.fail})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("not_checked")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "not_checked" ? "bg-border text-text shadow-xs" : "text-text-muted hover:text-text"
              }`}
            >
              – {t.checklist.notChecked} ({counts.not_checked})
            </button>
          </div>
        </div>

        {/* Filter Toolbar: Search + Department Dropdown + Type Dropdown + Reset */}
        <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2.5 sm:gap-3 rounded-xl border border-border/70 bg-page/40 p-2.5 sm:p-3">
          <div className="flex flex-1 flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0 sm:min-w-[200px] w-full sm:w-auto">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารายการตรวจ หรือเลขข้อกำหนด..."
                className="h-9 w-full rounded-lg border border-border/80 bg-surface pl-8 pr-7 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text"
                  title="ล้างคำค้นหา"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Department Filter Dropdown (Privileged only) */}
            {isPrivileged ? (
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-xs font-semibold text-text-muted shrink-0">แผนก:</span>
                <select
                  value={deptFilter}
                  onChange={(e) => handleDeptFilterChange(e.target.value)}
                  className="h-9 flex-1 sm:flex-none rounded-lg border border-border/80 bg-surface px-2.5 text-xs font-semibold text-text focus:border-primary focus:outline-hidden transition-colors cursor-pointer"
                >
                  <option value="all">🏢 ทุกแผนก ({checklists.length})</option>
                  {deptDropdownOptions.map((id) => {
                    const count = checklists.filter((c) => c.departmentId === id).length;
                    return (
                      <option key={id} value={id}>
                        {departmentName(id, lang)} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft/40 px-2.5 py-1.5 text-xs font-semibold text-primary">
                <span>🏢 แผนกของคุณ: {departmentName(user.departmentId, lang)}</span>
              </div>
            )}

            {/* Checklist Type Filter Dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-semibold text-text-muted shrink-0">เกณฑ์:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | "pass_fail" | "numeric")}
                className="h-9 flex-1 sm:flex-none rounded-lg border border-border/80 bg-surface px-2.5 text-xs font-semibold text-text focus:border-primary focus:outline-hidden transition-colors cursor-pointer"
              >
                <option value="all">📋 ทุกประเภทเกณฑ์</option>
                <option value="pass_fail">ผ่าน/ไม่ผ่าน (Pass/Fail)</option>
                <option value="numeric">เชิงตัวเลข (Numeric)</option>
              </select>
            </div>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger-soft transition-colors shadow-2xs cursor-pointer shrink-0 self-end sm:self-auto"
            >
              ✕ ล้างตัวกรอง
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          rows={filteredChecklists}
          rowKey={(c) => c.id}
          rowId={(c) => `checklist-row-${c.id}`}
          focusRowKey={targetId ?? undefined}
          rowClassName={(c) => (c.id === targetId ? "animate-row-highlight" : undefined)}
          emptyTitle={hasActiveFilters ? "ไม่พบรายการตรวจที่ตรงกับตัวกรอง" : t.checklist.empty}
        />
      </Card>

      {editing !== undefined && (
        <ChecklistFormModal
          standardId={standard.id}
          item={editing ?? undefined}
          requirements={requirements}
          onClose={() => setEditing(undefined)}
        />
      )}
      {recording && <RecordResultModal item={recording} onClose={() => setRecording(undefined)} />}
      {historyItem && (
        <InspectionDetailModal
          item={{ ...historyItem, standardLabel: `${standard.code}:${standard.version}` }}
          onClose={() => setHistoryItem(undefined)}
          hideStandardLink
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={t.checklist.deleteTitle}
        message={t.checklist.deleteMessage.replace("{name}", deleting ? `${deleting.clause} ${deleting.title}` : "")}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(undefined)}
      />
    </>
  );
}
