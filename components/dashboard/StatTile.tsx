"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Summary card: label · value · optional note.
 * When `onClick` is given the whole tile is a button (used to open a filtered list).
 */
export function StatTile({
  label,
  value,
  note,
  icon,
  accent = "primary",
  active,
  onClick,
  hero,
  className,
}: {
  label: string;
  value: string;
  note?: string;
  icon?: ReactNode;
  accent?: "primary" | "success" | "danger" | "neutral";
  active?: boolean;
  onClick?: () => void;
  hero?: boolean;
  className?: string;
}) {
  const iconBg = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    neutral: "bg-page text-text-muted",
  }[accent];

  const body = (
    <>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <p className="text-xs sm:text-sm font-semibold text-text-muted leading-snug">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold",
              iconBg,
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 font-bold leading-none tabular-nums",
          hero ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl",
        )}
      >
        {value}
      </p>
      {note && <p className="mt-2 sm:mt-3 text-[11px] sm:text-xs text-text-muted leading-snug">{note}</p>}
    </>
  );

  const base = cn("rounded-card bg-surface p-3.5 sm:p-5 text-left shadow-card", className);
  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        base,
        "w-full border-2 transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none",
        active ? "border-primary" : "border-transparent",
      )}
    >
      {body}
    </button>
  );
}
