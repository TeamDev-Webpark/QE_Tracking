"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type TooltipTone = "primary" | "success" | "warning" | "danger" | "neutral" | "info" | "purple";

const toneTextColors: Record<TooltipTone, string> = {
  info: "text-sky-400",
  purple: "text-purple-400",
  success: "text-emerald-400",
  danger: "text-rose-400",
  warning: "text-amber-400",
  primary: "text-blue-400",
  neutral: "text-slate-300",
};

const toneBorderColors: Record<TooltipTone, string> = {
  info: "border-sky-500/50 shadow-sky-500/10",
  purple: "border-purple-500/50 shadow-purple-500/10",
  success: "border-emerald-500/50 shadow-emerald-500/10",
  danger: "border-rose-500/50 shadow-rose-500/10",
  warning: "border-amber-500/50 shadow-amber-500/10",
  primary: "border-blue-500/50 shadow-blue-500/10",
  neutral: "border-slate-700/80 shadow-slate-950/20",
};

export function Tooltip({
  content,
  tone,
  className = "inline-flex cursor-help",
  children,
}: {
  content?: string;
  tone?: TooltipTone;
  className?: string;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number; placeBelow: boolean } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const placeBelow = rect.top < 70;
    setCoords({
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(placeBelow ? rect.bottom + 8 : rect.top - 8),
      placeBelow,
    });
  };

  const handleMouseEnter = () => {
    if (!content) return;
    updateCoords();
    setVisible(true);
  };

  const handleMouseLeave = () => {
    setVisible(false);
  };

  if (!content) return <>{children}</>;

  const hasColon = content.includes(":");
  const label = hasColon ? content.split(":")[0] : null;
  const desc = hasColon ? content.slice(content.indexOf(":") + 1).trim() : content;
  const activeTone = tone ?? "neutral";
  const borderColor = toneBorderColors[activeTone];
  const textColor = toneTextColors[activeTone];

  return (
    <span
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
      {visible &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              left: `${coords.x}px`,
              top: `${coords.y}px`,
              transform: coords.placeBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
              zIndex: 9999,
            }}
            className="pointer-events-none transition-opacity duration-150"
          >
            <div
              className={`relative max-w-xs rounded-xl border bg-slate-900 px-3.5 py-2 text-left text-xs font-medium leading-relaxed text-slate-100 shadow-2xl ${borderColor}`}
            >
              {label ? (
                <>
                  <span className={`font-bold ${textColor}`}>
                    {label}:
                  </span>{" "}
                  <span className="text-slate-200">{desc}</span>
                </>
              ) : (
                <span className="text-slate-200">{content}</span>
              )}
              <div
                className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-slate-900 ${
                  coords.placeBelow ? "-top-1.5 border-t border-l" : "-bottom-1.5 border-b border-r"
                } ${borderColor}`}
              />
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
