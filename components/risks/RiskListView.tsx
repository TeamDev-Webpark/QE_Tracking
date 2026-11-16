"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  PageHeader,
  useToast,
  type BadgeTone,
  type Column,
} from "@/components/ui";
import { StatTile } from "@/components/dashboard/StatTile";
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { departments } from "@/data/departments";
import { cn } from "@/lib/cn";
import { departmentName, formatDate } from "@/lib/format";
import { deleteRisk, updateRiskStatus } from "@/lib/risks/actions";
import type { RiskRequirementOption, RiskView } from "@/lib/risks/queries";
import type { RiskLevel, RiskStatus } from "@/lib/types";
import { RiskFormModal } from "./RiskFormModal";
import { RiskReviewModal } from "./RiskReviewModal";
import { RiskStatusDropdown } from "./RiskStatusDropdown";

const LEVEL_TONE: Record<RiskLevel, BadgeTone> = {
  low: "success",
  medium: "info",
  high: "warning",
  critical: "danger",
};

type QuickFocus = "all" | "high_critical" | "mitigating" | "monitored_closed";

export function RiskListView({
  risks,
  standards,
  owners,
  requirements,
  nextCode,
}: {
  risks: RiskView[];
  standards: { id: string; label: string }[];
  owners: { id: string; name: string; departmentId: string }[];
  requirements: RiskRequirementOption[];
  nextCode: string;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const role = useSessionUser().role;
  const canManage = role === "admin" || role === "qe";
  const canSeeAll = role === "admin" || role === "qe" || role === "iso";

  const [focus, setFocus] = useState<QuickFocus>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<RiskStatus | "all">("all");
  const [deptFilter, setDeptFilter] = useState("all");

  const [modalRisk, setModalRisk] = useState<RiskView | null | undefined>(undefined);
  const [reviewing, setReviewing] = useState<{ risk: RiskView; targetStatus: "monitored" | "closed" } | null>(null);
  const [deleting, setDeleting] = useState<RiskView | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return risks.filter((r) => {
      if (focus === "high_critical" && r.level !== "high" && r.level !== "critical") return false;
      if (focus === "mitigating" && r.status !== "mitigating") return false;
      if (focus === "monitored_closed" && r.status !== "monitored" && r.status !== "closed") return false;
      if (levelFilter !== "all" && r.level !== levelFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (deptFilter !== "all" && r.departmentId !== deptFilter) return false;
      if (!q) return true;
      const text = `${r.code} ${r.title} ${r.description} ${r.clause} ${r.mitigationPlan} ${departmentName(r.departmentId, lang)} ${r.ownerName}`.toLowerCase();
      return text.includes(q);
    });
  }, [risks, focus, levelFilter, statusFilter, deptFilter, deferredSearch, lang]);

  const highCriticalCount = risks.filter((r) => r.level === "high" || r.level === "critical").length;
  const mitigatingCount = risks.filter((r) => r.status === "mitigating").length;
  const monitoredClosedCount = risks.filter((r) => r.status === "monitored" || r.status === "closed").length;
  const hasFilters =
    focus !== "all" || search.trim() !== "" || levelFilter !== "all" || statusFilter !== "all" || deptFilter !== "all";

  function handleQuickStatus(risk: RiskView, nextStatus: RiskStatus) {
    if (risk.status === "open" && nextStatus === "closed") {
      toast.error("ต้องเปลี่ยนเป็น กำลังแก้ไข หรือ ติดตามผล ก่อนปิดเรื่อง");
      return;
    }
    if (nextStatus === "monitored" || nextStatus === "closed") {
      setReviewing({ risk, targetStatus: nextStatus });
      return;
    }
    startTransition(async () => {
      const res = await updateRiskStatus(risk.id, nextStatus);
      if (!res.ok) {
        if (res.error === "forbidden" || res.error === "notFound") {
          toast.error(t.errors[res.error]);
        } else {
          toast.error("ไม่สามารถเปลี่ยนสถานะได้");
        }
        return;
      }
      toast.success(t.risks.saved);
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteRisk(deleting.id);
      setDeleting(null);
      if (!res.ok) {
        if (res.error === "forbidden" || res.error === "notFound") {
          toast.error(t.errors[res.error]);
        }
        return;
      }
      toast.success(t.risks.deleted);
    });
  }

  const columns: Column<RiskView>[] = [
    {
      key: "title",
      header: t.risks.titleField,
      render: (r) => (
        <div className="min-w-[220px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-primary">{r.code}</span>
            {r.clause && <Badge tone="purple">{r.clause}</Badge>}
          </div>
          <p className="mt-0.5 font-semibold text-text">{r.title}</p>
          {r.mitigationPlan && (
            <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{r.mitigationPlan}</p>
          )}
        </div>
      ),
    },
    {
      key: "department",
      header: t.risks.department,
      render: (r) => (
        <div className="whitespace-nowrap text-xs">
          <p className="font-semibold text-text">{departmentName(r.departmentId, lang)}</p>
          <p className="text-text-muted">{r.ownerName}</p>
        </div>
      ),
    },
    {
      key: "score",
      header: t.risks.level,
      render: (r) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Badge tone={LEVEL_TONE[r.level]}>{t.riskLevel[r.level]}</Badge>
          <span className="text-xs text-text-muted tabular-nums">({r.score} คะแนน)</span>
        </div>
      ),
    },
    {
      key: "reviewDate",
      header: t.risks.reviewDate,
      render: (r) => (
        <span className="whitespace-nowrap text-xs text-text-muted">{formatDate(r.reviewDate, lang)}</span>
      ),
    },
    {
      key: "status",
      header: t.risks.status,
      render: (r) => (
        <RiskStatusDropdown
          value={r.status}
          disabled={pending}
          readOnly={!canManage}
          disabledStatuses={r.status === "open" ? ["closed"] : []}
          disabledReason="ต้องเปลี่ยนเป็น กำลังแก้ไข หรือ ติดตามผล ก่อนปิดเรื่อง"
          onChange={(next) => handleQuickStatus(r, next)}
          ariaLabel={`${t.risks.status} ${r.code}`}
        />
      ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            className: "w-px text-right",
            render: (r: RiskView) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setModalRisk(r)}
                  className="rounded-control p-2 text-text-muted hover:bg-page hover:text-primary"
                  aria-label={t.common.edit}
                >
                  <EditIcon width={16} height={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(r)}
                  className="rounded-control p-2 text-text-muted hover:bg-danger-soft hover:text-danger"
                  aria-label={t.common.delete}
                >
                  <TrashIcon width={16} height={16} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const toggleFocus = (target: QuickFocus) => setFocus((prev) => (prev === target ? "all" : target));

  return (
    <>
      <PageHeader
        title={t.nav.risks}
        description={t.pages.risks}
        actions={
          canManage ? (
            <Button onClick={() => setModalRisk(null)}>
              <PlusIcon width={18} height={18} />
              {t.risks.add}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setFocus("all")}
          className={cn(
            "text-left rounded-card transition-all cursor-pointer",
            focus === "all" && "ring-2 ring-primary/30",
          )}
        >
          <StatTile label={t.risks.total} value={String(risks.length)} icon="Σ" />
        </button>
        <button
          type="button"
          onClick={() => toggleFocus("high_critical")}
          className={cn(
            "text-left rounded-card transition-all cursor-pointer",
            focus === "high_critical" && "ring-2 ring-danger/40",
          )}
        >
          <StatTile label={t.risks.highCritical} value={String(highCriticalCount)} icon="!" accent="danger" />
        </button>
        <button
          type="button"
          onClick={() => toggleFocus("mitigating")}
          className={cn(
            "text-left rounded-card transition-all cursor-pointer",
            focus === "mitigating" && "ring-2 ring-primary/40",
          )}
        >
          <StatTile label={t.risks.mitigatingCount} value={String(mitigatingCount)} icon="↻" accent="neutral" />
        </button>
        <button
          type="button"
          onClick={() => toggleFocus("monitored_closed")}
          className={cn(
            "text-left rounded-card transition-all cursor-pointer",
            focus === "monitored_closed" && "ring-2 ring-success/40",
          )}
        >
          <StatTile label={t.risks.monitoredClosed} value={String(monitoredClosedCount)} icon="✓" accent="success" />
        </button>
      </div>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 border-b border-border/60 pb-3">
          <label className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <span className="sr-only">{t.common.search}</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" width={15} height={15} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.risks.searchPlaceholder}
              className="h-9 w-full rounded-lg border border-border/80 bg-surface pl-8 pr-3 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden transition-colors"
            />
          </label>

          <select
            aria-label={t.risks.level}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as RiskLevel | "all")}
            className="h-9 rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text cursor-pointer"
          >
            <option value="all">{t.risks.allLevels}</option>
            {(["critical", "high", "medium", "low"] as RiskLevel[]).map((l) => (
              <option key={l} value={l}>
                {t.riskLevel[l]}
              </option>
            ))}
          </select>

          <select
            aria-label={t.risks.status}
            title={statusFilter === "all" ? "กรองตามสถานะ: รอแก้ไข / กำลังแก้ไข / ติดตามผล / ปิดเรื่องแล้ว" : t.riskStatusDesc[statusFilter]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RiskStatus | "all")}
            className="h-9 rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text cursor-pointer"
          >
            <option value="all">{t.risks.allStatuses}</option>
            {(["open", "mitigating", "monitored", "closed"] as RiskStatus[]).map((s) => (
              <option key={s} value={s} title={t.riskStatusDesc[s]}>
                {t.riskStatus[s]}
              </option>
            ))}
          </select>

          {canSeeAll && (
            <select
              aria-label={t.risks.department}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text cursor-pointer"
            >
              <option value="all">{t.dashboard.all}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {departmentName(d.id, lang)}
                </option>
              ))}
            </select>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setFocus("all");
                setSearch("");
                setLevelFilter("all");
                setStatusFilter("all");
                setDeptFilter("all");
              }}
              className="rounded-lg border border-border/80 bg-page px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft transition-colors cursor-pointer shrink-0"
            >
              ✕ ล้างตัวกรอง
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          defaultPageSize={10}
          emptyTitle={t.risks.empty}
        />
      </Card>

      <RiskFormModal
        open={modalRisk !== undefined}
        risk={modalRisk ?? null}
        standards={standards}
        owners={owners}
        requirements={requirements}
        nextCode={nextCode}
        onClose={() => setModalRisk(undefined)}
      />

      {reviewing && (
        <RiskReviewModal
          risk={reviewing.risk}
          targetStatus={reviewing.targetStatus}
          onClose={() => setReviewing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={t.risks.deleteTitle}
        message={t.risks.deleteMessage.replace("{name}", deleting?.title ?? "")}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
