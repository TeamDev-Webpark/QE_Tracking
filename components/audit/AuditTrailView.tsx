"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { Badge, Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { getUserById, getUsers } from "@/data";
import type { Dictionary } from "@/i18n/dictionaries";
import { departmentName, formatDate, formatDateTime } from "@/lib/format";
import { todayInBangkok } from "@/lib/nc";
import type { AuditAction, AuditChange, AuditEntityType, AuditEntry } from "@/lib/types";
import { displayName } from "@/lib/user";
import { cn } from "@/lib/cn";

const PAGE_SIZES = [10, 25, 50, 100, 200] as const;

type Filter = {
  q: string;
  type: AuditEntityType | "";
  action: AuditAction | "";
  userId: string;
  from: string;
  to: string;
};
const empty: Filter = { q: "", type: "", action: "", userId: "", from: "", to: "" };

export function AuditTrailView({ entries }: { entries: AuditEntry[] }) {
  const { lang, t } = useI18n();
  const [f, setF] = useState<Filter>(empty);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const deferredQuery = useDeferredValue(f.q);

  const set = (k: keyof Filter) => (e: { target: { value: string } }) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setPage(1);
  };

  // Precompute user display names once
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of getUsers()) {
      map.set(u.id, displayName(u, lang));
    }
    return map;
  }, [lang]);

  const userName = (id: string) => userMap.get(id) ?? getUserById(id)?.name ?? id;

  const fieldLabel = (field: string) => {
    const [key, userId] = field.split(":");
    const label = t.auditField[key as keyof Dictionary["auditField"]] ?? key;
    return userId ? `${label} – ${userName(userId)}` : label;
  };

  const valueText = (c: AuditChange, v: string) => {
    if (!v) return "–";
    if (c.field === "departmentId") return departmentName(v, lang);
    if (c.field === "ownerId" || c.field === "userId") return userName(v);
    if (c.field === "checkedAt") return formatDateTime(v, lang);
    if (c.field === "reviewDate" || c.field === "completedDate" || c.field === "expiryDate") {
      return formatDate(v, lang);
    }
    return v;
  };

  // Precompute date (Bangkok YYYY-MM-DD), formatted timestamp, and searchable string once per entries change
  const indexedEntries = useMemo(() => {
    return entries.map((e) => {
      const resolvedUser = userMap.get(e.userId) || e.userName || e.userId;
      const day = todayInBangkok(new Date(e.at));
      const formattedAt = formatDateTime(e.at, lang);
      const searchText = [
        e.entityLabel,
        e.userName,
        resolvedUser,
        t.auditEntity[e.entityType] ?? "",
        t.auditAction[e.action] ?? "",
        e.note ?? "",
        ...(e.changes ?? []).flatMap((c) => [c.from, c.to]),
      ]
        .join(" ")
        .toLowerCase();

      return {
        raw: e,
        day,
        formattedAt,
        resolvedUser,
        searchText,
      };
    });
  }, [entries, lang, userMap, t]);

  // Summary counts per entity type (for quick filter chips)
  const entityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length };
    for (const e of entries) {
      counts[e.entityType] = (counts[e.entityType] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  // Fast memoized filtering & sorting
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const result = indexedEntries.filter((item) => {
      const e = item.raw;
      if (f.type && e.entityType !== f.type) return false;
      if (f.action && e.action !== f.action) return false;
      if (f.userId && e.userId !== f.userId) return false;
      if (f.from && item.day < f.from) return false;
      if (f.to && item.day > f.to) return false;
      if (q && !item.searchText.includes(q)) return false;
      return true;
    });

    if (sortOrder === "asc") {
      return [...result].reverse();
    }
    return result;
  }, [indexedEntries, f.type, f.action, f.userId, f.from, f.to, deferredQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visible = useMemo(
    () => filtered.slice(startIndex, startIndex + pageSize),
    [filtered, startIndex, pageSize],
  );

  const filtering =
    f.q !== "" || f.type !== "" || f.action !== "" || f.userId !== "" || f.from !== "" || f.to !== "";

  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandableOnPage = useMemo(
    () => visible.filter((x) => (x.raw.changes?.length ?? 0) > 0 || !!x.raw.note).map((x) => x.raw.id),
    [visible],
  );
  const allExpandedOnPage = expandableOnPage.length > 0 && expandableOnPage.every((id) => open.has(id));

  const toggleExpandPage = () => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (allExpandedOnPage) {
        for (const id of expandableOnPage) next.delete(id);
      } else {
        for (const id of expandableOnPage) next.add(id);
      }
      return next;
    });
  };

  const handleExportCsv = () => {
    const escapeCsv = (val: string) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const headers = [t.audit.at, t.audit.user, t.audit.entity, t.audit.action, "ID", t.audit.details, t.audit.note];
    const rows = filtered.map(({ raw: e, formattedAt, resolvedUser }) => {
      const changesStr = (e.changes ?? [])
        .map((c) => `${fieldLabel(c.field)}: ${valueText(c, c.from)} -> ${valueText(c, c.to)}`)
        .join("; ");
      return [
        formattedAt,
        resolvedUser,
        t.auditEntity[e.entityType],
        t.auditAction[e.action],
        e.entityLabel,
        changesStr,
        e.note ?? "",
      ]
        .map(escapeCsv)
        .join(",");
    });
    const csv = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${todayInBangkok()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build compact page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  return (
    <>
      <PageHeader
        title={t.nav.auditTrail}
        description={t.pages.auditTrail}
        actions={
          <Button variant="secondary" onClick={handleExportCsv} disabled={filtered.length === 0}>
            {t.audit.exportCsv} ({filtered.length.toLocaleString()})
          </Button>
        }
      />

      {/* Quick category filter chips for fast navigation on large datasets */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setF((x) => ({ ...x, type: "" }));
            setPage(1);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
            f.type === ""
              ? "border-primary bg-primary text-white shadow-xs"
              : "border-border bg-surface text-text hover:border-primary/40 hover:bg-primary-soft",
          )}
        >
          <span>{t.audit.allTypes}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
              f.type === "" ? "bg-white/20 text-white" : "bg-page text-text-muted",
            )}
          >
            {(entityCounts.all ?? 0).toLocaleString()}
          </span>
        </button>
        {(Object.keys(t.auditEntity) as AuditEntityType[]).map((k) => {
          const active = f.type === k;
          const cnt = entityCounts[k] ?? 0;
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                setF((x) => ({ ...x, type: active ? "" : k }));
                setPage(1);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                active
                  ? "border-primary bg-primary text-white shadow-xs"
                  : "border-border bg-surface text-text hover:border-primary/40 hover:bg-primary-soft",
              )}
            >
              <span>{t.auditEntity[k]}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-page text-text-muted",
                )}
              >
                {cnt.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        {/* Filter controls */}
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative xl:col-span-2">
            <span className="sr-only">{t.common.search}</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-muted" width={18} height={18} />
            <Input type="search" value={f.q} onChange={set("q")} placeholder={t.audit.searchPlaceholder} className="pl-11" />
          </label>
          <Select aria-label={t.audit.entity} value={f.type} onChange={set("type")}>
            <option value="">{t.audit.allTypes}</option>
            {(Object.keys(t.auditEntity) as AuditEntityType[]).map((k) => (
              <option key={k} value={k}>
                {t.auditEntity[k]}
              </option>
            ))}
          </Select>
          <Select aria-label={t.audit.action} value={f.action} onChange={set("action")}>
            <option value="">{t.audit.allActions}</option>
            {(Object.keys(t.auditAction) as AuditAction[]).map((k) => (
              <option key={k} value={k}>
                {t.auditAction[k]}
              </option>
            ))}
          </Select>
          <Select aria-label={t.audit.user} value={f.userId} onChange={set("userId")}>
            <option value="">{t.audit.allUsers}</option>
            {getUsers().map((u) => (
              <option key={u.id} value={u.id}>
                {displayName(u, lang)}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" aria-label={t.audit.from} title={t.audit.from} value={f.from} onChange={set("from")} />
            <Input type="date" aria-label={t.audit.to} title={t.audit.to} value={f.to} onChange={set("to")} />
          </div>
        </div>

        {/* Toolbar: counts, sort order, expand/collapse, page size */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
          <div className="flex flex-wrap items-center gap-3">
            <span aria-live="polite" className="font-medium">
              {filtered.length === 0
                ? t.audit.showing.replace("{shown}", "0").replace("{total}", "0")
                : t.audit.showingRange
                    .replace("{start}", (startIndex + 1).toLocaleString())
                    .replace("{end}", Math.min(startIndex + pageSize, filtered.length).toLocaleString())
                    .replace("{total}", filtered.length.toLocaleString())}
            </span>
            {filtering && (
              <button
                type="button"
                onClick={() => {
                  setF(empty);
                  setPage(1);
                }}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                {t.requirements.clearFilters}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {expandableOnPage.length > 0 && (
              <button
                type="button"
                onClick={toggleExpandPage}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                {allExpandedOnPage ? t.audit.collapseAll : t.audit.expandPage}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSortOrder((s) => (s === "desc" ? "asc" : "desc"));
                setPage(1);
              }}
              className="inline-flex items-center gap-1 rounded-control border border-border bg-page px-2.5 py-1 text-xs font-semibold text-text hover:border-primary/40 cursor-pointer"
            >
              {sortOrder === "desc" ? t.audit.sortNewest : t.audit.sortOldest}
            </button>

            <label className="inline-flex items-center gap-1.5 text-xs">
              <span>{t.audit.perPage}:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-control border border-border bg-page px-2 py-1 text-xs font-semibold text-text outline-none focus:border-primary"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">{entries.length === 0 ? t.audit.empty : t.audit.noMatch}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="bg-page">
                  <th className="rounded-l-xl px-4 py-3 font-bold">{t.audit.at}</th>
                  <th className="px-4 py-3 font-bold">{t.audit.user}</th>
                  <th className="px-4 py-3 font-bold">{t.audit.action}</th>
                  <th className="px-4 py-3 font-bold">{t.audit.entity}</th>
                  <th className="rounded-r-xl px-4 py-3 font-bold">{t.audit.details}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ raw: e, formattedAt, resolvedUser }) => {
                  const hasDetail = (e.changes?.length ?? 0) > 0 || !!e.note;
                  const isOpen = open.has(e.id);
                  return (
                    <Fragment key={e.id}>
                      <tr className="border-b border-border/60 align-top transition-colors hover:bg-page/40">
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums text-xs sm:text-sm">{formattedAt}</td>
                        <td className="px-4 py-3 font-medium">{resolvedUser}</td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={
                              e.action.startsWith("verify_fail") || e.action === "delete" || e.action === "cancel"
                                ? "danger"
                                : e.action === "verify_pass" || e.action === "publish"
                                  ? "success"
                                  : "primary"
                            }
                          >
                            {t.auditAction[e.action]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-text-muted">{t.auditEntity[e.entityType]}</p>
                          <p className="font-semibold">{e.entityLabel}</p>
                        </td>
                        <td className="px-4 py-3">
                          {hasDetail ? (
                            <button
                              type="button"
                              onClick={() => toggle(e.id)}
                              aria-expanded={isOpen}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline cursor-pointer"
                            >
                              {e.changes?.length ? `${e.changes.length} ${t.audit.field}` : t.audit.note}
                              <ChevronDownIcon width={14} height={14} className={cn("transition-transform", isOpen && "rotate-180")} />
                            </button>
                          ) : (
                            <span className="text-text-muted">–</span>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-border/60 bg-page/50">
                          <td colSpan={5} className="px-4 py-3">
                            {e.changes && e.changes.length > 0 && (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-text-muted">
                                    <th className="w-1/4 py-1 pr-3 font-semibold">{t.audit.field}</th>
                                    <th className="w-1/3 py-1 pr-3 font-semibold">{t.audit.before}</th>
                                    <th className="py-1 font-semibold">{t.audit.after}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {e.changes.map((c, i) => (
                                    <tr key={i}>
                                      <td className="py-1 pr-3 font-semibold">{fieldLabel(c.field)}</td>
                                      <td className="py-1 pr-3 text-text-muted line-through decoration-danger/50">{valueText(c, c.from)}</td>
                                      <td className="py-1">{valueText(c, c.to)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            {e.note && (
                              <p className="mt-2 text-xs">
                                <span className="font-semibold">{t.audit.note}:</span> {e.note}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm">
            <span className="text-xs font-medium text-text-muted">
              {t.audit.pageOf.replace("{page}", safePage.toLocaleString()).replace("{total}", totalPages.toLocaleString())}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label={t.audit.prevPage}
                className=" inline-flex h-8 items-center gap-1 rounded-control border border-border px-2.5 text-xs font-semibold transition-colors hover:bg-page disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeftIcon width={14} height={14} />
                <span className="hidden sm:inline">{t.audit.prevPage}</span>
              </button>

              {pageNumbers.map((n, idx) =>
                n === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-xs text-text-muted">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === safePage ? "page" : undefined}
                    className={cn(
                      "h-8 min-w-8 rounded-control border px-2 text-xs font-bold tabular-nums transition-colors cursor-pointer",
                      n === safePage
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-surface text-text hover:border-primary/40 hover:bg-page",
                    )}
                  >
                    {n.toLocaleString()}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label={t.audit.nextPage}
                className="inline-flex h-8 items-center gap-1 rounded-control border border-border px-2.5 text-xs font-semibold transition-colors hover:bg-page disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                <span className="hidden sm:inline">{t.audit.nextPage}</span>
                <ChevronRightIcon width={14} height={14} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
