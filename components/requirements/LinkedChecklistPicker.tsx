"use client";

import { useMemo, useState } from "react";
import { Input, Pagination, Select } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { ResultBadge } from "@/components/standards/ResultBadge";
import { useI18n } from "@/components/providers/I18nProvider";
import { departmentName } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ChecklistOption } from "@/lib/requirements/queries";

interface LinkedChecklistPickerProps {
  standardId: string;
  options: ChecklistOption[];
  selectedIds: string[];
  onToggle: (checklistId: string) => void;
}

const DEFAULT_PAGE_SIZE = 10;

export function LinkedChecklistPicker({
  standardId,
  options,
  selectedIds,
  onToggle,
}: LinkedChecklistPickerProps) {
  const { lang, t } = useI18n();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const departments = useMemo(() => {
    const ids = Array.from(new Set(options.map((c) => c.departmentId)));
    return ids.map((id) => ({ id, name: departmentName(id, lang) }));
  }, [options, lang]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((c) => {
      if (selectedOnly && !selectedIds.includes(c.id)) return false;
      if (dept !== "all" && c.departmentId !== dept) return false;
      if (!q) return true;
      return (
        c.clause.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        departmentName(c.departmentId, lang).toLowerCase().includes(q)
      );
    });
  }, [options, selectedOnly, selectedIds, dept, query, lang]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <fieldset className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="text-sm font-semibold">{t.requirements.linkedChecklists}</legend>
        <span className="text-xs text-text-muted">
          {t.requirements.selectedCount.replace("{n}", String(selectedIds.length))}
        </span>
      </div>
      <p className="text-xs text-text-muted">{t.requirements.linkHint}</p>

      {!standardId ? (
        <div className="rounded-control bg-page p-4 text-center text-sm text-text-muted">
          {t.requirements.selectStandardFirst}
        </div>
      ) : options.length === 0 ? (
        <div className="rounded-control bg-page p-4 text-center text-sm text-text-muted">
          {t.requirements.noChecklists}
        </div>
      ) : (
        <div className="space-y-2.5 rounded-control bg-page p-3">
          {/* Search + Filter controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={lang === "th" ? "ค้นหาข้อ, ชื่อรายการตรวจ..." : "Search clause or checklist..."}
                className="pl-9 bg-surface"
              />
            </div>

            {departments.length > 1 && (
              <Select
                value={dept}
                onChange={(e) => {
                  setDept(e.target.value);
                  setPage(1);
                }}
                className="sm:w-44 bg-surface"
                aria-label={lang === "th" ? "กรองตามแผนก" : "Filter by department"}
              >
                <option value="all">{lang === "th" ? "ทุกแผนก" : "All departments"}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedOnly((prev) => !prev);
                setPage(1);
              }}
              className={cn(
                "rounded-control border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer shrink-0",
                selectedOnly
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-text-muted hover:text-text",
              )}
            >
              {lang === "th" ? `เฉพาะที่เลือก (${selectedIds.length})` : `Selected (${selectedIds.length})`}
            </button>
          </div>

          {/* Checklist options */}
          {pageItems.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">
              {lang === "th" ? "ไม่พบรายการตรวจที่ตรงกับเงื่อนไข" : "No matching checklists"}
            </p>
          ) : (
            <div className="space-y-2">
              {pageItems.map((c) => {
                const checked = selectedIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-control border bg-surface px-3 py-2.5 text-sm transition-colors",
                      checked ? "border-primary bg-primary-soft/20" : "border-transparent hover:border-border",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(c.id)}
                      className="mt-1 accent-primary"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="font-semibold">
                        {c.clause} · {c.title}
                      </span>
                      <span className="block text-xs text-text-muted">{departmentName(c.departmentId, lang)}</span>
                    </span>
                    <ResultBadge passed={c.lastPassed} />
                  </label>
                );
              })}
            </div>
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
    </fieldset>
  );
}
