"use client";

import { useEffect, useId, type ReactNode } from "react";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Centered dialog with backdrop. Closes on Escape or backdrop click. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  closeLabel?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col rounded-t-card bg-surface shadow-card sm:rounded-card",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5 sm:px-6 sm:py-4">
          <h2 id={titleId} className="text-base sm:text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control p-1.5 text-text-muted hover:bg-page"
            aria-label={closeLabel}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 px-4 py-3.5 sm:px-6 sm:py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
