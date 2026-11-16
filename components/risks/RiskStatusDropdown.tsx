"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, type BadgeTone } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/cn";
import type { RiskStatus } from "@/lib/types";

const STATUSES: RiskStatus[] = ["open", "mitigating", "monitored", "closed"];

export const RISK_STATUS_TONE: Record<RiskStatus, BadgeTone> = {
  open: "danger",
  mitigating: "warning",
  monitored: "purple",
  closed: "success",
};

const DOT_COLOR: Record<RiskStatus, string> = {
  open: "bg-danger",
  mitigating: "bg-warning",
  monitored: "bg-purple-500",
  closed: "bg-success",
};

interface RectPos {
  top: number;
  bottom: number;
  left: number;
  width: number;
  openUpward: boolean;
}

function measureTrigger(el: HTMLElement | null): RectPos | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const spaceBelow = window.innerHeight - r.bottom;
  return {
    top: r.top,
    bottom: r.bottom,
    left: r.left,
    width: r.width,
    openUpward: spaceBelow < 260 && r.top > spaceBelow,
  };
}

export function RiskStatusDropdown({
  id,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  fullWidth = false,
  disabledStatuses = [],
  disabledReason,
  ariaLabel,
}: {
  id?: string;
  value: RiskStatus;
  onChange?: (next: RiskStatus) => void;
  disabled?: boolean;
  readOnly?: boolean;
  fullWidth?: boolean;
  disabledStatuses?: RiskStatus[];
  disabledReason?: string;
  ariaLabel?: string;
}) {
  const { t } = useI18n();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<RectPos | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function handleReposition() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  function handleMouseEnter() {
    setPos(measureTrigger(triggerRef.current));
    setHovered(true);
  }

  function handleMouseLeave() {
    setHovered(false);
  }

  function handleToggle() {
    if (readOnly || disabled) return;
    setPos(measureTrigger(triggerRef.current));
    setHovered(false);
    setOpen((prev) => !prev);
  }

  const portalRoot = typeof document !== "undefined" ? document.body : null;

  return (
    <>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={!readOnly ? open : undefined}
        aria-haspopup={!readOnly ? "listbox" : undefined}
        disabled={disabled}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center justify-between gap-2 rounded-lg border text-left transition-colors",
          readOnly
            ? "cursor-help border-transparent bg-transparent p-0"
            : cn(
                "cursor-pointer border-border bg-surface font-semibold text-text hover:border-primary/60 focus:border-primary focus:outline-none",
                fullWidth ? "h-10 w-full px-3 text-sm" : "h-8 min-w-[124px] px-2.5 text-xs",
              ),
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {readOnly ? (
          <Badge tone={RISK_STATUS_TONE[value]}>{t.riskStatus[value]}</Badge>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 truncate">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_COLOR[value])} />
              <span className="truncate">{t.riskStatus[value]}</span>
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", open && "rotate-180")}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </>
        )}
      </button>

      {/* Hover Tooltip */}
      {portalRoot && hovered && !open && pos &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              left: Math.min(Math.max(12, pos.left), window.innerWidth - 276),
              top: pos.top > 110 ? pos.top - 8 : pos.bottom + 8,
              transform: pos.top > 110 ? "translateY(-100%)" : "none",
              zIndex: 9999,
            }}
            className="pointer-events-none w-64 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-lg"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
              <span className={cn("h-2 w-2 rounded-full", DOT_COLOR[value])} />
              <span>{t.riskStatus[value]}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">{t.riskStatusDesc[value]}</p>
            {!readOnly && (
              <p className="mt-1.5 text-[11px] font-medium text-primary">คลิกเพื่อดูตัวเลือกและเปลี่ยนสถานะ</p>
            )}
          </div>,
          portalRoot,
        )}

      {/* Dropdown Menu */}
      {portalRoot && open && pos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel ?? t.risks.status}
            style={{
              position: "fixed",
              left: Math.min(Math.max(12, pos.left), window.innerWidth - 300),
              top: pos.openUpward ? pos.top - 6 : pos.bottom + 6,
              transform: pos.openUpward ? "translateY(-100%)" : "none",
              width: Math.max(pos.width, 280),
              zIndex: 9999,
            }}
            className="rounded-xl border border-border bg-surface p-1.5 shadow-xl"
          >
            {STATUSES.map((s) => {
              const active = s === value;
              const isOptionDisabled = !active && disabledStatuses.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-disabled={isOptionDisabled}
                  disabled={isOptionDisabled}
                  onClick={() => {
                    if (isOptionDisabled) return;
                    setOpen(false);
                    if (s !== value) onChange?.(s);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    isOptionDisabled
                      ? "cursor-not-allowed opacity-50"
                      : active
                        ? "bg-primary/10 cursor-pointer"
                        : "hover:bg-page cursor-pointer",
                  )}
                >
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", DOT_COLOR[s])} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-xs font-semibold", active ? "text-primary" : "text-text")}>
                        {t.riskStatus[s]}
                      </span>
                      {active && (
                        <span className="text-[11px] font-semibold text-primary">✓ ใช้อยู่</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                      {isOptionDisabled && disabledReason ? disabledReason : t.riskStatusDesc[s]}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>,
          portalRoot,
        )}
    </>
  );
}
