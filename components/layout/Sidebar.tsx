"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/config/navigation";
import { canAccess, isActivePath } from "@/config/access";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { cn } from "@/lib/cn";

function Brand({
  isCollapsed,
  onToggle,
  onClose,
}: {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative flex h-topbar items-center justify-between border-b border-border/40 px-4 sm:px-6 transition-all duration-200",
        isCollapsed && "lg:justify-center lg:px-2",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "group flex items-center gap-2.5 font-extrabold tracking-tight transition-all active:scale-95 cursor-pointer select-none text-left rounded-xl p-1.5 hover:bg-page",
          isCollapsed && "lg:justify-center lg:gap-0",
        )}
        title={isCollapsed ? "คลิกเพื่อแสดงแถบเมนู (Show Sidebar)" : "คลิกเพื่อซ่อนแถบเมนู (Hide Sidebar)"}
        aria-label={isCollapsed ? "แสดงแถบเมนู" : "ซ่อนแถบเมนู"}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white font-black text-sm shadow-xs transition-transform group-hover:scale-105">
          QE
        </span>
        <span
          className={cn(
            "text-lg font-bold tracking-tight text-text leading-tight group-hover:text-primary transition-colors",
            isCollapsed && "lg:hidden",
          )}
        >
          <span className="text-primary">QE</span>Tracking
        </span>
      </button>

      {/* Mobile drawer close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-page text-text-muted transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary active:scale-95 cursor-pointer"
          title="ซ่อนแถบเมนู"
          aria-label="ซ่อนแถบเมนู"
        >
          <ChevronLeftIcon width={16} height={16} strokeWidth={2.4} />
        </button>
      )}

      {/* Desktop: Small < / > indicator beside the sidebar edge */}
      <button
        type="button"
        onClick={onToggle}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-xs transition-all hover:border-primary/50 hover:bg-primary-soft hover:text-primary active:scale-95 cursor-pointer"
        title={isCollapsed ? "แสดงแถบเมนู (>)" : "ซ่อนแถบเมนู (<)"}
        aria-label={isCollapsed ? "แสดงแถบเมนู" : "ซ่อนแถบเมนู"}
      >
        {isCollapsed ? (
          <ChevronRightIcon width={13} height={13} strokeWidth={2.4} />
        ) : (
          <ChevronLeftIcon width={13} height={13} strokeWidth={2.4} />
        )}
      </button>
    </div>
  );
}

export function Sidebar({
  isCollapsed = false,
  onToggle,
  onNavigate,
  onClose,
}: {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const user = useSessionUser();

  // Only show menus the current role is allowed to open; drop empty groups.
  const groups = navigation
    .map((g) => ({ ...g, items: g.items.filter((item) => canAccess(user.role, item.href)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <Brand isCollapsed={isCollapsed} onToggle={onToggle ?? onClose} onClose={onClose} />
      <nav className="flex-1 overflow-y-auto pb-6" aria-label={t.common.mainMenu}>
        {groups.map((group, i) => (
          <div
            key={group.titleKey ?? i}
            className={cn(
              "pt-3 pb-1 first:pt-2 border-t border-border/60 first:border-t-0",
              isCollapsed && i > 0 && "lg:border-border/40 lg:my-1 lg:mx-2",
            )}
          >
            {group.titleKey && (
              <p
                className={cn(
                  "px-6 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted",
                  isCollapsed && "lg:hidden",
                )}
              >
                {t.nav[group.titleKey]}
              </p>
            )}
            <ul className="space-y-1.5">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                const label = t.nav[item.labelKey];
                return (
                  <li
                    key={item.href}
                    className={cn("relative px-4 sm:px-5", isCollapsed && "lg:px-2")}
                  >
                    {active && (
                      <span
                        className={cn(
                          "absolute inset-y-1 left-0 w-1.5 rounded-r-control bg-primary",
                          isCollapsed && "lg:w-1",
                        )}
                      />
                    )}
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={label}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-control transition-all group",
                        isCollapsed && "lg:h-11 lg:w-11 lg:mx-auto lg:justify-center lg:px-0 lg:py-0 lg:gap-0",
                        active
                          ? "bg-primary text-white shadow-xs"
                          : "text-text hover:bg-primary-soft hover:text-primary",
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className={cn("truncate", isCollapsed && "lg:hidden")}>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

/** Shown while the pathname is not yet resolved (Suspense fallback). */
export function SidebarSkeleton({ isCollapsed = false }: { isCollapsed?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <Brand isCollapsed={isCollapsed} />
      <div className={cn("space-y-2 pt-2", isCollapsed ? "px-2" : "px-6")}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse rounded-control bg-page",
              isCollapsed ? "h-11 w-11 mx-auto" : "h-11 w-full",
            )}
          />
        ))}
      </div>
    </div>
  );
}
