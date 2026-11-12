import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Tooltip } from "./Tooltip";

export type BadgeTone = "primary" | "success" | "warning" | "danger" | "neutral" | "info" | "purple";

const tones: Record<BadgeTone, string> = {
  primary: "bg-blue-100 text-blue-800 border border-blue-200",
  success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  warning: "bg-amber-100 text-amber-900 border border-amber-200",
  danger: "bg-rose-100 text-rose-800 border border-rose-200",
  neutral: "bg-slate-100 text-slate-700 border border-slate-200",
  info: "bg-sky-100 text-sky-800 border border-sky-200",
  purple: "bg-purple-100 text-purple-800 border border-purple-200",
};

export function Badge({
  tone = "neutral",
  title,
  className,
  children,
}: {
  tone?: BadgeTone;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const badge = (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold transition-colors",
        title && "cursor-help",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );

  if (!title) return badge;
  return <Tooltip content={title} tone={tone}>{badge}</Tooltip>;
}
