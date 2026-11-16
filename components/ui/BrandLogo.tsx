import { cn } from "@/lib/cn";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="qe-logo-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B8EFF" />
          <stop offset="100%" stopColor="#3566E6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#qe-logo-grad)" />
      {/* ISO Shield + Verification Check */}
      <path
        d="M20 8.5L29.5 12.2V19.6C29.5 25.3 25.4 29.8 20 31.5C14.6 29.8 10.5 25.3 10.5 19.6V12.2L20 8.5Z"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15.2 20.1L18.5 23.4L25.2 16.4"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLogo({
  compact = false,
  size = "md",
  showSubtitle = false,
}: {
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
}) {
  const iconSize = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const textSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <BrandMark className={cn(iconSize, "shadow-xs transition-transform group-hover:scale-105")} />
      {!compact && (
        <span className="flex flex-col leading-none text-left">
          <span className={cn("font-extrabold tracking-tight text-text", textSize)}>
            <span className="text-primary">QE</span>Tracking
          </span>
          {showSubtitle && (
            <span className="mt-1 text-[11px] font-medium tracking-wide text-text-muted">
              ISO Management System
            </span>
          )}
        </span>
      )}
    </span>
  );
}
