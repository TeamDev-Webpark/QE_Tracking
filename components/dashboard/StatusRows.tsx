"use client";

import Link from "next/link";
import { Tooltip, type BadgeTone } from "@/components/ui";
import { cn } from "@/lib/cn";

export type Segment = {
  key: string;
  label: string;
  title?: string;
  tone?: BadgeTone;
  value: number;
  color: string; // Tailwind bg-* class
  href?: string; // row opens the filtered list
};

/**
 * One row per state: name and count (with %) on top, a full-width thick bar underneath.
 * Identity never relies on color: every bar has its state name and count beside it.
 */
export function StatusRows({ segments, ariaLabel }: { segments: Segment[]; ariaLabel: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const pct = (v: number) => (total === 0 ? 0 : Math.round((v / total) * 100));

  return (
    <ul aria-label={ariaLabel} className="space-y-1">
      {segments.map((s) => {
        const row = (
          <>
            <span className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-text-muted">{s.label}</span>
              <span className="whitespace-nowrap tabular-nums">
                <strong>{s.value}</strong>
                <span className="ml-1.5 text-xs text-text-muted">{pct(s.value)}%</span>
              </span>
            </span>
            <span className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-page">
              <span
                className={cn("block h-full rounded-full", s.color)}
                style={{ width: `${pct(s.value)}%`, minWidth: s.value > 0 ? 6 : 0 }}
              />
            </span>
          </>
        );
        const base = "block w-full rounded-control px-2 py-1.5 transition-colors";
        const content = s.href ? (
          <Link
            href={s.href}
            aria-label={`${s.label} ${s.value} (${pct(s.value)}%)`}
            className={cn(base, "hover:bg-page focus-visible:bg-page focus-visible:outline-none")}
          >
            {row}
          </Link>
        ) : (
          <div className={base}>{row}</div>
        );

        return (
          <li key={s.key}>
            <Tooltip content={s.title} tone={s.tone} className="block w-full">
              {content}
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
