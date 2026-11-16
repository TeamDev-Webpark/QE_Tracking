"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input, Pagination, Select } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { ResultBadge } from "@/components/standards/ResultBadge";
import { departmentName } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Lang } from "@/i18n/dictionaries";
import type { ChecklistOption } from "@/lib/requirements/queries";

type StatusFilter = "all" | "pass" | "fail" | "pending";

interface LinkedChecklistsPanelProps {
  checklists: ChecklistOption[];
  lang: Lang;
}

const DEFAULT_PAGE_SIZE = 10;

export function LinkedChecklistsPanel({ checklists, lang }: LinkedChecklistsPanelProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dept, setDept] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const departments = useMemo(() => {
    const ids = Array.from(new Set(checklists.map((c) => c.departmentId)));
    return ids.map((id) => ({ id, name: departmentName(id, lang) }));
  }, [checklists, lang]);

  const counts = useMemo(() => {
    let pass = 0;
    let fail = 0;
    let pending = 0;
    for (const c of checklists) {
      if (c.lastPassed === true) pass += 1;
      else if (c.lastPassed === false) fail += 1;
      else pending += 1;
    }
    return { all: checklists.length, pass, fail, pending };
  }, [checklists]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return checklists.filter((c) => {
      if (status === "pass" && c.lastPassed !== true) return false;
      if (status === "fail" && c.lastPassed !== false) return false;
      if (status === "pending" && c.lastPassed !== undefined) return false;
      if (dept !== "all" && c.departmentId !== dept) return false;
      if (!q) return true;
      return (
        c.clause.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        departmentName(c.departmentId, lang).toLowerCase().includes(q)
      );
    });
  }, [checklists, status, dept, query, lang]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: lang === "th" ? "ทั้งหมด" : "All", count: counts.all },
    { key: "pass", label: lang === "th" ? "ผ่าน" : "Pass", count: counts.pass },
    { key: "fail", label: lang === "th" ? "ไม่ผ่าน" : "Fail", count: counts.fail },
    { key: "pending", label: lang === "th" ? "ยังไม่ตรวจ" : "Pending", count: counts.pending },
  ];

  return (
    <div className="space-y-3">
      {/* Search + Filters */}
      <div className="flex flex-col gap-2.5 rounded-control bg-page p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={lang === "th" ? "ค้นหาข้อ, ชื่อรายการตรวจ, แผนก..." : "Search clause, item, dept..."}
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
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                status === tab.key
                  ? "bg-primary text-white"
                  : "bg-surface text-text-muted hover:text-text border border-border/70",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] tabular-nums",
                  status === tab.key ? "bg-white/20 text-white" : "bg-page text-text-muted",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {pageItems.length === 0 ? (
        <div className="rounded-control border border-dashed border-border p-6 text-center text-sm text-text-muted">
          {lang === "th" ? "ไม่พบรายการตรวจที่ตรงกับเงื่อนไข" : "No matching checklists"}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {pageItems.map((c) => (
            <li
              key={c.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-control border border-border/80 bg-surface p-3.5 hover:border-primary/40 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                    {lang === "th" ? `ข้อ ${c.clause}` : `Clause ${c.clause}`}
                  </span>
                  <span className="text-xs text-text-muted">
                    🏢 {departmentName(c.departmentId, lang)}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-text">{c.title}</p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <ResultBadge passed={c.lastPassed} />
                <Link
                  href={`/standards/${c.standardId}?highlight=${c.id}&dept=${c.departmentId}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary-soft/60 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  <span>{lang === "th" ? "เปิดในมาตรฐาน ISO" : "Open in ISO Standard"}</span>
                  <span>↗</span>
                </Link>
              </div>
            </li>
          ))}
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
  );
}
