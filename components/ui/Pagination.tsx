"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";

export const DEFAULT_PAGE_SIZES = [10, 25, 50, 100] as const;

/** Shared pagination bar with range summary, page size selector, page buttons, and jump-to-page input. */
export function Pagination({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizes = DEFAULT_PAGE_SIZES,
  compact = false,
}: {
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange?: (nextSize: number) => void;
  pageSizes?: readonly number[];
  compact?: boolean;
}) {
  const [jumpInput, setJumpInput] = useState("");
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const displayEnd = Math.min(startIndex + pageSize, totalItems);

  const handleJump = (e: FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpInput.trim(), 10);
    if (!isNaN(target)) {
      onPageChange(Math.min(Math.max(1, target), totalPages));
      setJumpInput("");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-text-muted">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          แสดง <strong className="text-text tabular-nums">{(startIndex + 1).toLocaleString()}</strong> ถึง{" "}
          <strong className="text-text tabular-nums">{displayEnd.toLocaleString()}</strong> จากทั้งหมด{" "}
          <strong className="text-text tabular-nums">{totalItems.toLocaleString()}</strong> รายการ
        </span>
        {onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5">
            <span>แสดงต่อหน้า:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-control border border-border bg-surface px-2 py-1 text-xs font-semibold text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s} รายการ
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1">
            {!compact && (
              <button
                type="button"
                title="หน้าแรก"
                onClick={() => onPageChange(1)}
                disabled={safePage <= 1}
                className="rounded-control border border-border px-2 py-1 font-bold hover:bg-page disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                «
              </button>
            )}
            <button
              type="button"
              onClick={() => onPageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="rounded-control border border-border px-2.5 py-1 font-semibold hover:bg-page disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ‹ ก่อนหน้า
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                if (p === 1 || p === totalPages || Math.abs(p - safePage) <= 1) {
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onPageChange(p)}
                      className={cn(
                        "min-w-7 rounded-control px-2 py-1 text-center font-bold tabular-nums transition-colors cursor-pointer",
                        safePage === p
                          ? "bg-primary text-white shadow-xs"
                          : "border border-border hover:bg-page text-text",
                      )}
                    >
                      {p.toLocaleString()}
                    </button>
                  );
                }
                if (p === 2 && safePage > 3) {
                  return (
                    <span key={p} className="px-1 text-text-muted">
                      …
                    </span>
                  );
                }
                if (p === totalPages - 1 && safePage < totalPages - 2) {
                  return (
                    <span key={p} className="px-1 text-text-muted">
                      …
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              type="button"
              onClick={() => onPageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              className="rounded-control border border-border px-2.5 py-1 font-semibold hover:bg-page disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ถัดไป ›
            </button>
            {!compact && (
              <button
                type="button"
                title="หน้าสุดท้าย"
                onClick={() => onPageChange(totalPages)}
                disabled={safePage >= totalPages}
                className="rounded-control border border-border px-2 py-1 font-bold hover:bg-page disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                »
              </button>
            )}
          </div>

          {!compact && (
            <form onSubmit={handleJump} className="flex items-center gap-1.5 pl-2.5 border-l border-border/80">
              <span className="text-text-muted whitespace-nowrap">ไปที่หน้า:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder={String(safePage)}
                className="w-12 rounded-control border border-border bg-surface px-1.5 py-1 text-center font-bold tabular-nums text-text text-xs focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-text-muted whitespace-nowrap">/ {totalPages.toLocaleString()}</span>
              <button
                type="submit"
                className="rounded-control border border-border bg-surface px-2.5 py-1 font-bold text-text hover:bg-primary hover:text-white hover:border-primary transition-colors text-xs cursor-pointer"
              >
                ไป
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
