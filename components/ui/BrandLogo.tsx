import Image from "next/image";
import { cn } from "@/lib/cn";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl", className)}>
      <Image
        src="/logo-icon.png"
        alt="Webpark Logo"
        width={36}
        height={36}
        className="h-full w-full object-contain"
      />
    </span>
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
      <BrandMark className={cn(iconSize, "transition-transform group-hover:scale-105")} />
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
