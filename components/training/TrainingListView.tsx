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
import { departmentName, formatDate } from "@/lib/format";
import { deleteTraining } from "@/lib/training/actions";
import type { TrainingRequirementOption, TrainingView } from "@/lib/training/queries";
import type { TrainingHealth } from "@/lib/types";
import { TrainingFormModal } from "./TrainingFormModal";

const HEALTH_TONE: Record<TrainingHealth, BadgeTone> = {
  planned: "neutral",
  valid: "success",
  expiring: "warning",
  expired: "danger",
};

export function TrainingListView({
  records,
  standards,
  users,
  requirements,
  nextCode,
}: {
  records: TrainingView[];
  standards: { id: string; label: string }[];
  users: { id: string; name: string; departmentId: string }[];
  requirements: TrainingRequirementOption[];
  nextCode: string;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const role = useSessionUser().role;
  const canManage = role === "admin" || role === "qe";
  const canSeeAll = role === "admin" || role === "qe" || role === "iso";

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [healthFilter, setHealthFilter] = useState<TrainingHealth | "all">("all");
  const [deptFilter, setDeptFilter] = useState("all");

  const [modalRecord, setModalRecord] = useState<TrainingView | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<TrainingView | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return records.filter((r) => {
      if (healthFilter !== "all" && r.health !== healthFilter) return false;
      if (deptFilter !== "all" && r.departmentId !== deptFilter) return false;
      if (!q) return true;
      const text = `${r.code} ${r.title} ${r.userName} ${r.trainer} ${r.clause} ${departmentName(r.departmentId, lang)}`.toLowerCase();
      return text.includes(q);
    });
  }, [records, healthFilter, deptFilter, deferredSearch, lang]);

  const validCount = records.filter((r) => r.health === "valid").length;
  const expiringExpiredCount = records.filter((r) => r.health === "expiring" || r.health === "expired").length;
  const plannedCount = records.filter((r) => r.health === "planned").length;

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteTraining(deleting.id);
      setDeleting(null);
      if (!res.ok) {
        if (res.error) toast.error(t.errors[res.error]);
        return;
      }
      toast.success(t.training.deleted);
    });
  }

  const columns: Column<TrainingView>[] = [
    {
      key: "title",
      header: t.training.titleField,
      render: (r) => (
        <div className="min-w-[220px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-primary">{r.code}</span>
            {r.clause && <Badge tone="purple">{r.clause}</Badge>}
          </div>
          <p className="mt-0.5 font-semibold text-text">{r.title}</p>
          <p className="mt-0.5 text-xs text-text-muted">{r.trainer}</p>
        </div>
      ),
    },
    {
      key: "employee",
      header: t.training.employee,
      render: (r) => (
        <div className="whitespace-nowrap text-xs">
          <p className="font-semibold text-text">{r.userName}</p>
          <p className="text-text-muted">{departmentName(r.departmentId, lang)}</p>
        </div>
      ),
    },
    {
      key: "dates",
      header: `${t.training.completedDate} / ${t.training.expiryDate}`,
      render: (r) => (
        <div className="whitespace-nowrap text-xs text-text-muted">
          <p>{r.completedDate ? formatDate(r.completedDate, lang) : "–"}</p>
          {r.expiryDate && (
            <p className={r.health === "expired" ? "font-semibold text-danger" : ""}>
              {t.training.expiryDate}: {formatDate(r.expiryDate, lang)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "score",
      header: t.training.score,
      render: (r) =>
        r.status === "completed" ? (
          <div className="whitespace-nowrap text-xs">
            <span className="font-semibold text-text tabular-nums">{r.score !== undefined ? `${r.score}/100` : "–"}</span>
            {r.passed !== undefined && (
              <span className={`ml-1.5 font-semibold ${r.passed ? "text-success" : "text-danger"}`}>
                ({r.passed ? t.training.passed : t.training.notPassed})
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-text-muted">–</span>
        ),
    },
    {
      key: "health",
      header: t.training.status,
      render: (r) => <Badge tone={HEALTH_TONE[r.health]}>{t.trainingHealth[r.health]}</Badge>,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            className: "w-px text-right",
            render: (r: TrainingView) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setModalRecord(r)}
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

  return (
    <>
      <PageHeader
        title={t.nav.training}
        description={t.pages.training}
        actions={
          canManage ? (
            <Button onClick={() => setModalRecord(null)}>
              <PlusIcon width={18} height={18} />
              {t.training.add}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t.training.total} value={String(records.length)} icon="Σ" />
        <StatTile label={t.training.validCount} value={String(validCount)} icon="✓" accent="success" />
        <StatTile label={t.training.expiringExpired} value={String(expiringExpiredCount)} icon="!" accent="danger" />
        <StatTile label={t.training.plannedCount} value={String(plannedCount)} icon="◷" accent="neutral" />
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
              placeholder={t.training.searchPlaceholder}
              className="h-9 w-full rounded-lg border border-border/80 bg-surface pl-8 pr-3 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden transition-colors"
            />
          </label>

          <select
            aria-label={t.training.status}
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value as TrainingHealth | "all")}
            className="h-9 rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text cursor-pointer"
          >
            <option value="all">{t.training.allHealth}</option>
            {(["valid", "expiring", "expired", "planned"] as TrainingHealth[]).map((h) => (
              <option key={h} value={h}>
                {t.trainingHealth[h]}
              </option>
            ))}
          </select>

          {canSeeAll && (
            <select
              aria-label={t.training.department}
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
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          defaultPageSize={10}
          emptyTitle={t.training.empty}
        />
      </Card>

      <TrainingFormModal
        open={modalRecord !== undefined}
        record={modalRecord ?? null}
        standards={standards}
        users={users}
        requirements={requirements}
        nextCode={nextCode}
        onClose={() => setModalRecord(undefined)}
      />

      <ConfirmDialog
        open={!!deleting}
        title={t.training.deleteTitle}
        message={t.training.deleteMessage.replace("{name}", deleting?.title ?? "")}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
