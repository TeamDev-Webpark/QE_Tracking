"use client";

import { useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Summary } from "@/lib/dashboard";
import { cn } from "@/lib/cn";

export type ChartRow = { key: string; label: string; summary: Summary };

type Segment = "passed" | "failed" | "notChecked";

const SEGMENTS: { key: Segment; color: string; mark: string }[] = [
  { key: "passed", color: "bg-chart-pass", mark: "✓" },
  { key: "failed", color: "bg-chart-fail", mark: "✗" },
  { key: "notChecked", color: "bg-chart-none", mark: "–" },
];

export const formatPercent = (v: number | null) => (v === null ? "–" : `${v.toLocaleString("en-US")}%`);

/**
 * One card per group (standard or department): a ring showing the pass rate
 * (passed ÷ checked) with the counts written out underneath. A table view is one click away.
 */
export function ResultsBarChart({
  rows,
  groupLabel,
  pageSize = 8,
  selectedKey,
  onRowClick,
}: {
  rows: ChartRow[];
  groupLabel: string;
  scrollable?: boolean;
  maxHeightClass?: string;
  pageSize?: number;
  selectedKey?: string;
  onRowClick?: (row: ChartRow) => void;
}) {
  const { t } = useI18n();
  const [asTable, setAsTable] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const segLabel: Record<Segment, string> = {
    passed: t.dashboard.passed,
    failed: t.dashboard.failed,
    notChecked: t.dashboard.notChecked,
  };

  const filteredRows = search.trim()
    ? rows.filter((r) => r.label.toLowerCase().includes(search.trim().toLowerCase()))
    : rows;

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredRows.length);
  const pagedRows = filteredRows.slice(startIdx, endIdx);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div>
      {/* Header controls: Search input (when items > 3) + toggle view button */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {rows.length > 3 ? (
          <div className="relative flex flex-1 sm:flex-none items-center min-w-[160px]">
            <span className="pointer-events-none absolute left-2.5 text-xs text-text-muted">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={`ค้นหา${groupLabel}...`}
              className="h-8 w-full sm:w-auto rounded-lg border border-border/80 bg-page/70 pl-7 pr-7 text-xs text-text placeholder:text-text-muted focus:border-primary focus:bg-surface focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2 text-xs text-text-muted hover:text-text"
                title="ล้างคำค้นหา"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2 shrink-0">
          {totalPages > 1 && (
            <span className="text-[11px] text-text-muted hidden sm:inline">
              หน้า {safePage} จาก {totalPages} ({filteredRows.length} {groupLabel})
            </span>
          )}
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            className="rounded-lg border border-border/70 bg-page/60 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-page hover:border-primary/40 transition-colors"
          >
            {asTable ? t.dashboard.showChart : t.dashboard.showTable}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">{t.dashboard.noItems}</p>
      ) : filteredRows.length === 0 ? (
        <div className="py-8 text-center text-xs text-text-muted">
          ไม่พบ{groupLabel}ที่ตรงกับ &ldquo;{search}&rdquo;
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="ml-2 font-semibold text-primary hover:underline"
          >
            ล้างคำค้นหา
          </button>
        </div>
      ) : asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm tabular-nums">
            <thead>
              <tr className="bg-page text-left">
                <th className="rounded-l-xl px-3 py-2 font-bold">{groupLabel}</th>
                <th className="px-3 py-2 text-right font-bold">{t.dashboard.passed}</th>
                <th className="px-3 py-2 text-right font-bold">{t.dashboard.failed}</th>
                <th className="px-3 py-2 text-right font-bold">{t.dashboard.notChecked}</th>
                <th className="px-3 py-2 text-right font-bold">{t.dashboard.compliance}</th>
                {onRowClick && <th className="rounded-r-xl px-3 py-2 text-center font-bold">รายละเอียด</th>}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((r) => {
                const isSelected = selectedKey === r.key;
                return (
                  <tr
                    key={r.key}
                    onClick={() => onRowClick?.(r)}
                    className={cn(
                      "border-b border-border/60 last:border-b-0 transition-colors",
                      isSelected
                        ? "bg-primary-soft/50 font-semibold"
                        : onRowClick
                          ? "cursor-pointer hover:bg-primary-soft/30 group"
                          : "hover:bg-page/40",
                    )}
                  >
                    <td className="px-3 py-2.5 font-medium">
                      {r.label}
                      {isSelected && <span className="ml-1.5 text-xs text-primary font-bold">(เลือกอยู่)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-success font-semibold">{r.summary.passed}</td>
                    <td className="px-3 py-2.5 text-right text-danger font-semibold">{r.summary.failed}</td>
                    <td className="px-3 py-2.5 text-right text-text-muted">{r.summary.notChecked}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{formatPercent(r.summary.compliance)}</td>
                    {onRowClick && (
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-bold text-primary group-hover:underline">
                          {isSelected ? "ดูด้านล่าง ↓" : "กรองดู ↓"}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5 sm:gap-3">
          {pagedRows.map((r) => {
            const isSelected = selectedKey === r.key;
            return (
              <li
                key={r.key}
                onClick={() => onRowClick?.(r)}
                className={cn(
                  "flex flex-col items-center rounded-card border p-3 sm:p-4 text-center transition-all bg-surface relative",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 bg-primary-soft/20 shadow-sm"
                    : "border-border/70",
                  onRowClick
                    ? "cursor-pointer hover:border-primary hover:shadow-md hover:-translate-y-1 active:scale-[0.99] group"
                    : "hover:border-primary/40 hover:shadow-xs",
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                    เลือกอยู่ ✓
                  </span>
                )}
                <p className="mb-3 line-clamp-2 min-h-10 text-sm font-bold">{r.label}</p>
                <PassRing summary={r.summary} label={`${r.label} ${t.dashboard.compliance}`} />
                <p className="mt-2 text-xs text-text-muted">
                  {t.dashboard.checkedOf
                    .replace("{checked}", String(r.summary.checked))
                    .replace("{total}", String(r.summary.total))}
                </p>
                <ul className="mt-3 w-full space-y-1 text-left text-xs">
                  {SEGMENTS.map((s) => (
                    <li key={s.key} className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", s.color)} aria-hidden="true" />
                      <span className="flex-1 text-text-muted">
                        {s.mark} {segLabel[s.key]}
                      </span>
                      <span className="font-bold tabular-nums">{r.summary[s.key]}</span>
                    </li>
                  ))}
                </ul>
                {onRowClick && (
                  <div className="mt-3 pt-2 w-full border-t border-border/40 flex items-center justify-center gap-1 text-[11px] font-bold text-primary group-hover:underline">
                    <span>{isSelected ? "กำลังดูรายการด้านล่าง" : "ดูรายการตรวจ"}</span>
                    <span className="transition-transform group-hover:translate-y-0.5">↓</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination Controls: Show 6 at a time, with Prev / Next and page buttons */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs">
          <div className="text-text-muted">
            แสดง <strong className="font-bold text-text">{startIdx + 1}-{endIdx}</strong> จากทั้งหมด{" "}
            <strong className="font-bold text-text">{filteredRows.length}</strong> {groupLabel}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex items-center gap-1 rounded-lg border border-border/80 bg-surface px-2.5 py-1.5 font-semibold text-text hover:bg-page hover:border-primary/40 disabled:pointer-events-none disabled:opacity-40 transition-all shadow-2xs cursor-pointer"
              title={`ย้อนกลับ (${pageSize} ${groupLabel}ก่อนหน้า)`}
            >
              <span className="text-[10px]">❮</span>
              <span>ก่อนหน้า</span>
            </button>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = pageNum === safePage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "h-7 min-w-7 rounded-lg px-2 text-xs font-bold transition-all cursor-pointer",
                      isCurrent
                        ? "bg-primary text-white shadow-2xs"
                        : "border border-border/70 bg-surface text-text-muted hover:bg-page hover:text-text",
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="flex items-center gap-1 rounded-lg border border-border/80 bg-surface px-2.5 py-1.5 font-semibold text-text hover:bg-page hover:border-primary/40 disabled:pointer-events-none disabled:opacity-40 transition-all shadow-2xs cursor-pointer"
              title={`ไปต่อ (${pageSize} ${groupLabel}ถัดไป)`}
            >
              <span>ถัดไป</span>
              <span className="text-[10px]">❯</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Donut chart: segments for passed (green), failed (red), and not checked (gray). Center shows pass rate %. */
export function PassRing({ summary, label }: { summary: Summary; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const total = summary.total;

  const passedLen = total > 0 ? (summary.passed / total) * c : 0;
  const failedLen = total > 0 ? (summary.failed / total) * c : 0;
  const notCheckedLen = total > 0 ? (summary.notChecked / total) * c : 0;

  const offsetPassed = 0;
  const offsetFailed = -passedLen;
  const offsetNotChecked = -(passedLen + failedLen);

  return (
    <div
      role="img"
      aria-label={`${label}: ${formatPercent(summary.compliance)} (ผ่าน ${summary.passed}, ไม่ผ่าน ${summary.failed}, ยังไม่ตรวจ ${summary.notChecked})`}
      className="relative h-24 w-24"
    >
      <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90" aria-hidden="true">
        {/* Track / Fallback background circle */}
        <circle cx="42" cy="42" r={r} fill="none" strokeWidth="9" className="stroke-slate-200/50" />

        {/* Passed (Green) */}
        {passedLen > 0 && (
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            strokeWidth="9"
            strokeDasharray={`${passedLen} ${c}`}
            strokeDashoffset={offsetPassed}
            className="stroke-chart-pass"
          />
        )}

        {/* Failed (Red) */}
        {failedLen > 0 && (
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            strokeWidth="9"
            strokeDasharray={`${failedLen} ${c}`}
            strokeDashoffset={offsetFailed}
            className="stroke-chart-fail"
          />
        )}

        {/* Not Checked (Gray) */}
        {notCheckedLen > 0 && (
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            strokeWidth="9"
            strokeDasharray={`${notCheckedLen} ${c}`}
            strokeDashoffset={offsetNotChecked}
            className="stroke-chart-none"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums">
        {formatPercent(summary.compliance)}
      </span>
    </div>
  );
}
