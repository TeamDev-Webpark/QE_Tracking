"use client";

import Link from "next/link";
import { useMemo, useState, type Ref } from "react";
import { DataTable, type Column } from "@/components/ui";
import { EditIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { ResultBadge } from "@/components/standards/ResultBadge";
import { formatCriteria } from "@/lib/checklist";
import { itemState, type InspectionItem, type ResultState } from "@/lib/dashboard";
import { departmentName, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { InspectionDetailModal } from "./InspectionDetailModal";

export type ResultTab = ResultState | "all";
type SortOption = "clause" | "result_fail_first" | "title" | "latest_date";

/**
 * Inspection results list with Pass / Fail tabs, search, standard filter,
 * sorting, and pagination to comfortably support large numbers of inspection items.
 */
export function InspectionResults({
  items,
  tab,
  onTabChange,
  department,
  onDepartmentChange,
  ref,
}: {
  items: InspectionItem[];
  tab: ResultTab;
  onTabChange: (tab: ResultTab) => void;
  department?: string;
  onDepartmentChange?: (dept: string) => void;
  ref?: Ref<HTMLDivElement>;
}) {
  const { lang, t } = useI18n();
  const [detail, setDetail] = useState<InspectionItem>();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStandard, setSelectedStandard] = useState<string>("all");
  const [internalDept, setInternalDept] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("clause");

  const selectedDept = department !== undefined ? department : internalDept;
  const handleDeptChange = (dept: string) => {
    if (onDepartmentChange) {
      onDepartmentChange(dept);
    } else {
      setInternalDept(dept);
    }
    setPage(1);
  };

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState("");

  // Tab counts
  const counts: Record<ResultTab, number> = { all: items.length, pass: 0, fail: 0, not_checked: 0 };
  for (const i of items) counts[itemState(i)]++;

  // Unique department options for dropdown
  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (!map.has(item.departmentId)) {
        map.set(item.departmentId, departmentName(item.departmentId, lang));
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [items, lang]);

  // Unique standard options for dropdown
  const standardOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (!map.has(item.standardId)) {
        map.set(item.standardId, item.standardLabel);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [items]);

  // 1. Filter by Tab
  const tabFiltered = useMemo(() => {
    return tab === "all" ? items : items.filter((i) => itemState(i) === tab);
  }, [items, tab]);

  // 2. Filter by Department
  const deptFiltered = useMemo(() => {
    if (selectedDept === "all") return tabFiltered;
    return tabFiltered.filter((i) => i.departmentId === selectedDept);
  }, [tabFiltered, selectedDept]);

  // 3. Filter by Standard
  const standardFiltered = useMemo(() => {
    if (selectedStandard === "all") return deptFiltered;
    return deptFiltered.filter((i) => i.standardId === selectedStandard);
  }, [deptFiltered, selectedStandard]);

  // 4. Search query filter
  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return standardFiltered;
    return standardFiltered.filter((i) => {
      const matchTitle = i.title.toLowerCase().includes(q);
      const matchClause = i.clause.toLowerCase().includes(q);
      const matchStd = i.standardLabel.toLowerCase().includes(q);
      const matchDept = departmentName(i.departmentId, lang).toLowerCase().includes(q);
      return matchTitle || matchClause || matchStd || matchDept;
    });
  }, [standardFiltered, searchQuery, lang]);

  // 4. Sort
  const sortedRows = useMemo(() => {
    const rows = [...searchFiltered];
    rows.sort((a, b) => {
      if (sortBy === "clause") {
        return a.clause.localeCompare(b.clause, undefined, { numeric: true });
      }
      if (sortBy === "result_fail_first") {
        const order: Record<ResultState, number> = { fail: 0, not_checked: 1, pass: 2 };
        const diff = order[itemState(a)] - order[itemState(b)];
        if (diff !== 0) return diff;
        return a.clause.localeCompare(b.clause, undefined, { numeric: true });
      }
      if (sortBy === "latest_date") {
        const dateA = a.results[0]?.checkedAt ? new Date(a.results[0].checkedAt).getTime() : 0;
        const dateB = b.results[0]?.checkedAt ? new Date(b.results[0].checkedAt).getTime() : 0;
        return dateB - dateA;
      }
      return a.title.localeCompare(b.title, "th");
    });
    return rows;
  }, [searchFiltered, sortBy]);

  // 5. Pagination calculations
  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRows = sortedRows.slice(startIndex, startIndex + pageSize);
  const displayEnd = Math.min(startIndex + pageSize, totalItems);

  // Reset page helper
  const handleTabChange = (nextTab: ResultTab) => {
    onTabChange(nextTab);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedStandard("all");
    handleDeptChange("all");
    setSortBy("clause");
    setPage(1);
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput.trim(), 10);
    if (!isNaN(target)) {
      const clamped = Math.max(1, Math.min(totalPages, target));
      setPage(clamped);
      setJumpPageInput("");
    }
  };

  const tabs: { key: ResultTab; label: string }[] = [
    { key: "all", label: t.dashboard.all },
    { key: "pass", label: `✓ ${t.dashboard.passed}` },
    { key: "fail", label: `✗ ${t.dashboard.failed}` },
    { key: "not_checked", label: `– ${t.dashboard.notChecked}` },
  ];

  const columns: Column<InspectionItem>[] = [
    {
      key: "item",
      header: t.checklist.item,
      render: (i) => (
        <>
          <p className="text-xs font-semibold text-text-muted">
            <Link
              href={`/standards/${i.standardId}?highlight=${i.id}&dept=${i.departmentId}`}
              className="text-primary font-bold hover:underline inline-flex items-center gap-1 group"
              title={`คลิกเพื่อเปิดหน้า ${i.standardLabel} และชี้ตำแหน่งข้อนี้`}
            >
              <span>{i.standardLabel}</span>
              <span className="text-[10px] text-primary/70 transition-transform group-hover:translate-x-0.5">↗</span>
            </Link>
            <span> · {t.checklist.clause} {i.clause}</span>
          </p>
          <p className="font-semibold text-text mt-0.5">{i.title}</p>
          <p className="text-xs text-text-muted mt-0.5">🏢 {departmentName(i.departmentId, lang)}</p>
        </>
      ),
    },
    {
      key: "criteria",
      header: t.checklist.criteria,
      render: (i) => (
        <span className="whitespace-nowrap font-medium text-xs">
          {i.criteria ? formatCriteria(i.criteria) : t.checklist.typePassFail}
        </span>
      ),
    },
    {
      key: "actualValue",
      header: t.checklist.actualValue,
      render: (i) => {
        const r = i.results[0];
        if (!r) return <span className="text-text-muted">–</span>;
        if (typeof r.value === "number") {
          return (
            <span className="font-bold tabular-nums whitespace-nowrap text-text text-xs">
              {r.value.toLocaleString("en-US")} {i.criteria?.unit}
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
      render: (i) => {
        const r = i.results[0];
        return (
          <div className="space-y-1">
            <ResultBadge passed={r?.passed} />
            {r && <p className="text-xs whitespace-nowrap text-text-muted">{formatDateTime(r.checkedAt, lang)}</p>}
          </div>
        );
      },
    },
    {
      key: "detail",
      header: "",
      className: "w-px text-right whitespace-nowrap",
      render: (i) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <Link
            href={`/standards/${i.standardId}?highlight=${i.id}&dept=${i.departmentId}`}
            className="inline-flex items-center gap-1 rounded-control border border-border/80 bg-surface px-2.5 py-1.5 text-xs font-semibold text-text hover:border-primary/50 hover:bg-primary-soft hover:text-primary transition-all shadow-2xs group"
            title={`เปิดหน้ามาตรฐาน ${i.standardLabel} เพื่อชี้ตำแหน่งและแก้ไขข้อนี้`}
          >
            <EditIcon width={12} height={12} className="text-text-muted group-hover:text-primary transition-colors" />
            <span>แก้ไขใน ISO</span>
            <span className="text-[10px] text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5">↗</span>
          </Link>
          <button
            type="button"
            onClick={() => setDetail(i)}
            className="rounded-control px-2.5 py-1.5 text-xs font-bold whitespace-nowrap text-primary hover:bg-primary-soft transition-colors cursor-pointer"
          >
            {t.dashboard.viewDetail}
          </button>
        </div>
      ),
    },
  ];

  const hasActiveFilters =
    searchQuery.trim() !== "" || selectedStandard !== "all" || selectedDept !== "all";

  return (
    <div ref={ref} className="scroll-mt-24 space-y-4">
      {/* Top Controls: Status Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t.dashboard.results} className="flex flex-wrap gap-2">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              role="tab"
              aria-selected={tab === tb.key}
              onClick={() => handleTabChange(tb.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-xs",
                tab === tb.key
                  ? "bg-primary text-white shadow-sm"
                  : "bg-page text-text-muted hover:text-primary hover:bg-border/50",
              )}
            >
              {tb.label} <span className="ml-1 opacity-80 tabular-nums">({counts[tb.key]})</span>
            </button>
          ))}
        </div>

        {/* Page size indicator */}
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>แสดงต่อหน้า:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-control border border-border bg-surface px-2 py-1 text-xs font-semibold text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={5}>5 รายการ</option>
            <option value={10}>10 รายการ</option>
            <option value={20}>20 รายการ</option>
            <option value={50}>50 รายการ</option>
            <option value={100}>100 รายการ</option>
          </select>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 rounded-control border border-border/80 bg-page/70 p-2.5">
        {/* Search input */}
        <div className="relative flex-1 min-w-0 sm:min-w-[220px] w-full sm:w-auto">
          <span className="absolute inset-y-0 left-3 flex items-center text-text-muted pointer-events-none text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="ค้นหาข้อกำหนด, ชื่อรายการตรวจ, แผนก..."
            className="w-full rounded-control border border-border bg-surface py-1.5 pr-8 pl-8 text-xs text-text placeholder:text-text-muted/70 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setPage(1);
              }}
              className="absolute inset-y-0 right-2.5 flex items-center text-xs text-text-muted hover:text-text"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter by Department */}
        {departmentOptions.length > 1 && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <label htmlFor="dept-filter" className="text-xs font-semibold text-text-muted whitespace-nowrap shrink-0">
              แผนก:
            </label>
            <select
              id="dept-filter"
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="flex-1 sm:flex-none rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs text-text font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">ทุกแผนก ({tabFiltered.length})</option>
              {departmentOptions.map((opt) => {
                const count = tabFiltered.filter((i) => i.departmentId === opt.id).length;
                return (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Filter by Standard */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <label htmlFor="standard-filter" className="text-xs font-semibold text-text-muted whitespace-nowrap shrink-0">
            มาตรฐาน:
          </label>
          <select
            id="standard-filter"
            value={selectedStandard}
            onChange={(e) => {
              setSelectedStandard(e.target.value);
              setPage(1);
            }}
            className="flex-1 sm:flex-none rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs text-text font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">ทุกมาตรฐาน ISO ({deptFiltered.length})</option>
            {standardOptions.map((opt) => {
              const count = deptFiltered.filter((i) => i.standardId === opt.id).length;
              return (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Sort by */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <label htmlFor="sort-by" className="text-xs font-semibold text-text-muted whitespace-nowrap shrink-0">
            เรียงตาม:
          </label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex-1 sm:flex-none rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs text-text font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="clause">ข้อกำหนด (Clause)</option>
            <option value="result_fail_first">ผลตรวจ (ไม่ผ่านขึ้นก่อน)</option>
            <option value="latest_date">วันที่ตรวจ (ล่าสุดก่อน)</option>
            <option value="title">ชื่อรายการ (ก-ฮ)</option>
          </select>
        </div>

        {/* Reset filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-control px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors self-end sm:self-auto"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        rows={paginatedRows}
        rowKey={(i) => i.id}
        paginate={false}
        emptyTitle={hasActiveFilters ? "ไม่พบรายการตรวจที่ตรงกับคำค้นหา" : t.dashboard.noResults}
      />

      {/* Pagination & Count Summary Bar */}
      {totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-text-muted">
          <div>
            แสดง <strong className="text-text tabular-nums">{startIndex + 1}</strong> ถึง{" "}
            <strong className="text-text tabular-nums">{displayEnd}</strong> จากทั้งหมด{" "}
            <strong className="text-text tabular-nums">{totalItems}</strong> รายการ
            {totalItems !== items.length && (
              <span className="ml-1 opacity-75">(กรองจากทั้งหมด {items.length} รายการ)</span>
            )}
          </div>

          {/* Page navigation buttons & Jump to page */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1">
                {/* First Page button */}
                <button
                  type="button"
                  title="หน้าแรก"
                  onClick={() => setPage(1)}
                  disabled={safePage <= 1}
                  className="rounded-control border border-border px-2 py-1 font-bold hover:bg-page disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  «
                </button>

                {/* Previous button */}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="rounded-control border border-border px-2.5 py-1 font-semibold hover:bg-page disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹ ก่อนหน้า
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    // Show pages within window of 2 from current page, plus first and last
                    if (p === 1 || p === totalPages || Math.abs(p - safePage) <= 1) {
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={cn(
                            "min-w-7 rounded-control px-2 py-1 text-center font-bold tabular-nums transition-colors",
                            safePage === p
                              ? "bg-primary text-white shadow-xs"
                              : "border border-border hover:bg-page text-text",
                          )}
                        >
                          {p}
                        </button>
                      );
                    }
                    if (p === 2 && safePage > 3) {
                      return <span key={p} className="px-1 text-text-muted">…</span>;
                    }
                    if (p === totalPages - 1 && safePage < totalPages - 2) {
                      return <span key={p} className="px-1 text-text-muted">…</span>;
                    }
                    return null;
                  })}
                </div>

                {/* Next button */}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="rounded-control border border-border px-2.5 py-1 font-semibold hover:bg-page disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ถัดไป ›
                </button>

                {/* Last Page button */}
                <button
                  type="button"
                  title="หน้าสุดท้าย"
                  onClick={() => setPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="rounded-control border border-border px-2 py-1 font-bold hover:bg-page disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  »
                </button>
              </div>

              {/* Jump to page form */}
              <form onSubmit={handleJumpPage} className="flex items-center gap-1.5 pl-2.5 border-l border-border/80">
                <span className="text-text-muted whitespace-nowrap">ไปที่หน้า:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  placeholder={String(safePage)}
                  className="w-12 rounded-control border border-border bg-surface px-1.5 py-1 text-center font-bold tabular-nums text-text text-xs focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-text-muted whitespace-nowrap">/ {totalPages}</span>
                <button
                  type="submit"
                  className="rounded-control border border-border bg-surface px-2.5 py-1 font-bold text-text hover:bg-primary hover:text-white hover:border-primary transition-colors text-xs"
                >
                  ไป
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Modal Detail */}
      {detail && <InspectionDetailModal item={detail} onClose={() => setDetail(undefined)} />}
    </div>
  );
}
