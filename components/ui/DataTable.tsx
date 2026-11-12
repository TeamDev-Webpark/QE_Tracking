"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EmptyState } from "./EmptyState";
import { Pagination } from "./Pagination";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

/** Generic table with built-in pagination (defaults to 10 rows per page). Scrolls horizontally on small screens. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowClassName,
  rowId,
  emptyTitle = "ไม่มีข้อมูล",
  paginate = true,
  defaultPageSize = 10,
  focusRowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string | undefined;
  rowId?: (row: T) => string | undefined;
  emptyTitle?: string;
  paginate?: boolean;
  defaultPageSize?: number;
  focusRowKey?: string;
}) {
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const firstKey = rows[0] ? rowKey(rows[0]) : "";
  const sig = `${rows.length}:${firstKey}:${focusRowKey ?? ""}:${pageSize}`;

  const focusIndex = focusRowKey ? rows.findIndex((r) => rowKey(r) === focusRowKey) : -1;
  const focusPage = focusIndex >= 0 ? Math.floor(focusIndex / pageSize) + 1 : null;

  const [pageState, setPageState] = useState<{ page: number; sig: string }>({
    page: focusPage ?? 1,
    sig,
  });

  if (rows.length === 0) return <EmptyState title={emptyTitle} />;

  const totalItems = rows.length;
  const totalPages = paginate ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const rawPage = pageState.sig === sig ? pageState.page : (focusPage ?? 1);
  const safePage = paginate ? Math.min(Math.max(1, rawPage), totalPages) : 1;

  const setPage = (next: number) => {
    setPageState({ page: Math.min(Math.max(1, next), totalPages), sig });
  };

  const startIndex = paginate ? (safePage - 1) * pageSize : 0;
  const displayEnd = paginate ? Math.min(startIndex + pageSize, totalItems) : totalItems;
  const visibleRows = paginate ? rows.slice(startIndex, displayEnd) : rows;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="bg-page">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("px-4 py-3 font-bold first:rounded-l-xl last:rounded-r-xl", c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                id={rowId ? rowId(row) : `row-${rowKey(row)}`}
                key={rowKey(row)}
                className={cn(
                  "border-b border-border/60 last:border-b-0 transition-colors hover:bg-page/40",
                  rowClassName?.(row),
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-4", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginate && (
        <Pagination
          totalItems={totalItems}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
