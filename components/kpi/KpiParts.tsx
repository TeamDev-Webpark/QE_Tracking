"use client";

import { Badge, type BadgeTone } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import type { KpiStatus } from "@/lib/kpi";
import type { KpiView } from "@/lib/kpi/queries";
import { cn } from "@/lib/cn";
import { departmentName } from "@/lib/format";

const tones: Record<KpiStatus, BadgeTone> = { achieved: "success", not_achieved: "danger", no_data: "neutral" };

export function KpiStatusBadge({ status }: { status: KpiStatus }) {
  const { t } = useI18n();
  const mark = status === "achieved" ? "✓ " : status === "not_achieved" ? "✗ " : "";
  return (
    <Badge tone={tones[status]}>
      {mark}
      {t.kpiStatus[status]}
    </Badge>
  );
}

export const fmt = (n: number | null, unit = "") =>
  n === null ? "–" : `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;

/**
 * Bullet chart: bar = Actual (green when achieved, red when not), black tick = Target.
 * Scale = 125% of the larger of the two so the target tick never sits on the edge.
 */
export function KpiBullet({ kpi }: { kpi: KpiView }) {
  const { t } = useI18n();
  const max = Math.max(kpi.target, kpi.actual ?? 0) * 1.25 || 1;
  const targetPos = (kpi.target / max) * 100;
  const actualPos = kpi.actual === null ? 0 : (Math.max(0, kpi.actual) / max) * 100;
  const label = `${t.kpi.actual} ${fmt(kpi.actual, kpi.unit)} · ${t.kpi.target} ${fmt(kpi.target, kpi.unit)}`;

  return (
    <div role="img" aria-label={label} title={label} className="relative h-5 w-40 rounded-[4px] bg-page">
      {kpi.actual !== null && (
        <div
          className={cn(
            "absolute inset-y-1 left-0 rounded-r-[4px]",
            kpi.result.status === "achieved" ? "bg-chart-pass" : "bg-chart-fail",
          )}
          style={{ width: `${actualPos}%` }}
        />
      )}
      <div className="absolute -inset-y-0.5 w-[2px] bg-text" style={{ left: `calc(${targetPos}% - 1px)` }} />
    </div>
  );
}

/**
 * One card per KPI: full name, big Actual, Target, a meter with the target tick, and the status.
 * Each card has its own scale (KPIs use different units), so nothing is compared across cards by length.
 */
export function KpiCards({ kpis }: { kpis: KpiView[] }) {
  const { lang, t } = useI18n();
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {kpis.map((k) => {
        const max = Math.max(k.target, k.actual ?? 0) * 1.2 || 1;
        const targetPos = (k.target / max) * 100;
        const actualPos = k.actual === null ? 0 : (Math.max(0, k.actual) / max) * 100;
        const ok = k.result.status === "achieved";
        return (
          <li key={k.id} className="flex flex-col rounded-card border border-border/70 p-4">
            <p className="line-clamp-2 min-h-10 font-bold" title={k.name}>
              {k.name}
            </p>
            <p className="text-xs text-text-muted">{departmentName(k.departmentId, lang)}</p>

            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl leading-none font-bold tabular-nums">
                {k.actual === null ? "–" : k.actual.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                {k.actual !== null && k.unit && <span className="ml-1 text-base font-semibold text-text-muted">{k.unit}</span>}
              </p>
              <p className="text-right text-xs text-text-muted">
                {t.kpi.target}
                <span className="block text-sm font-bold text-text tabular-nums">
                  {k.direction === "higher" ? "≥" : "≤"} {fmt(k.target, k.unit)}
                </span>
              </p>
            </div>

            <div
              role="img"
              aria-label={`${t.kpi.actual} ${fmt(k.actual, k.unit)} · ${t.kpi.target} ${fmt(k.target, k.unit)}`}
              className="relative mt-3 h-3 rounded-full bg-page"
            >
              {k.actual !== null && (
                <div
                  className={cn("absolute inset-y-0 left-0 rounded-full", ok ? "bg-chart-pass" : "bg-chart-fail")}
                  style={{ width: `${actualPos}%`, minWidth: 6 }}
                />
              )}
              <div className="absolute -inset-y-1 w-[2px] rounded bg-text" style={{ left: `calc(${targetPos}% - 1px)` }} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <KpiStatusBadge status={k.result.status} />
              {k.result.achievement !== null && (
                <span className="text-xs text-text-muted tabular-nums">
                  {t.kpi.ofTarget.replace("{n}", String(k.result.achievement))}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
