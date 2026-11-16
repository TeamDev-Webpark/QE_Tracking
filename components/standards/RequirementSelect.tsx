"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input, Pagination, Select } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { departmentName } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { RequirementClauseOption } from "@/lib/standards/queries";

interface RequirementSelectProps {
  requirements: RequirementClauseOption[];
  value: string;
  departmentFilter?: string;
  onSelect: (req: RequirementClauseOption) => void;
  invalid?: boolean;
}

const DEFAULT_PAGE_SIZE = 10;

export function RequirementSelect({
  requirements,
  value,
  departmentFilter,
  onSelect,
  invalid = false,
}: RequirementSelectProps) {
  const { lang, t } = useI18n();
  const selected = useMemo(() => requirements.find((r) => r.id === value), [requirements, value]);
  const [open, setOpen] = useState(!selected);
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState(departmentFilter && departmentFilter !== "" ? departmentFilter : "all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const departments = useMemo(() => {
    const ids = Array.from(new Set(requirements.map((r) => r.departmentId)));
    return ids.map((id) => ({ id, name: departmentName(id, lang) }));
  }, [requirements, lang]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requirements.filter((r) => {
      if (dept !== "all" && r.departmentId !== dept) return false;
      if (!q) return true;
      return (
        r.number.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        departmentName(r.departmentId, lang).toLowerCase().includes(q)
      );
    });
  }, [requirements, dept, query, lang]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (requirements.length === 0) {
    return (
      <div className="rounded-control border border-dashed border-border bg-page p-4 text-center text-sm text-text-muted">
        <p>{t.checklist.noRequirements}</p>
        <Link
          href="/requirements"
          className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
        >
          {t.checklist.goToRequirements} ↗
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selected ? (
        <div
          className={cn(
            "flex items-center justify-between gap-2.5 rounded-control border bg-surface px-3 py-2.5",
            invalid ? "border-danger" : "border-primary/40",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 rounded bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
              {selected.number}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text" title={selected.name}>
              {selected.name}
            </span>
            <span className="hidden sm:inline-block shrink-0 rounded-full bg-page px-2 py-0.5 text-[11px] text-text-muted">
              {departmentName(selected.departmentId, lang)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="shrink-0 rounded-lg border border-border bg-page px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary-soft/60 transition-colors cursor-pointer"
          >
            {open ? t.common.close : "เปลี่ยน"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-center justify-between rounded-control border bg-surface px-3 py-2.5 text-sm text-text-muted transition-colors cursor-pointer hover:border-primary/50",
            invalid ? "border-danger" : "border-border",
          )}
        >
          <span>{t.checklist.selectClause}...</span>
          <span className="text-xs font-semibold text-primary">{open ? t.common.close : "เลือก"}</span>
        </button>
      )}

      {open && (
        <div className="space-y-2.5 rounded-control border border-border/80 bg-page p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="ค้นหาเลขข้อ หรือชื่อข้อกำหนด..."
                className="bg-surface pl-9"
              />
            </div>

            {departments.length > 1 && (
              <Select
                value={dept}
                onChange={(e) => {
                  setDept(e.target.value);
                  setPage(1);
                }}
                className="bg-surface sm:w-44"
                aria-label="กรองข้อกำหนดตามแผนก"
              >
                <option value="all">ทุกแผนก ({requirements.length})</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {pageItems.length === 0 ? (
            <div className="py-4 text-center text-xs text-text-muted">
              ไม่พบข้อกำหนดที่ตรงกับเงื่อนไข
              {dept !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setDept("all");
                    setPage(1);
                  }}
                  className="ml-2 font-bold text-primary hover:underline cursor-pointer"
                >
                  ดูทุกแผนก
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {pageItems.map((r) => {
                const isSelected = r.id === value;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(r);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2.5 rounded-control border px-3 py-2 text-left transition-colors cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary-soft/30"
                          : "border-transparent bg-surface hover:border-primary/40",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="shrink-0 rounded bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                          {r.number}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text" title={r.name}>
                          {r.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-text-muted">
                        {departmentName(r.departmentId, lang)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {filtered.length > DEFAULT_PAGE_SIZE && (
            <Pagination
              compact
              totalItems={filtered.length}
              page={safePage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize);
                setPage(1);
              }}
              pageSizes={[10, 25, 50]}
            />
          )}
        </div>
      )}
    </div>
  );
}
