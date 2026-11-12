"use client";

import { Badge, type BadgeTone } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import type { NcDisplayStatus } from "@/lib/nc";

const tones: Record<NcDisplayStatus, BadgeTone> = {
  open: "info",
  in_progress: "warning",
  overdue: "danger",
  pending_verification: "purple",
  closed: "success",
};

export function NcStatusBadge({ status }: { status: NcDisplayStatus }) {
  const { t } = useI18n();
  return (
    <Badge tone={tones[status]} title={t.ncStatusTooltip[status]}>
      {t.ncStatus[status]}
    </Badge>
  );
}

/** Meter: fill and track are the same hue (track is the lighter step). */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-24 overflow-hidden rounded-full bg-primary-soft"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

/** Whole days between two YYYY-MM-DD dates (b − a). */
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** "15 พ.ย. 2569" — date-only values are formatted as calendar dates (no time zone shift). */
export function formatDateOnly(date: string, lang: "th" | "en") {
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
