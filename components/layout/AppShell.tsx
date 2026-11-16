"use client";

import { Suspense, useState, type ReactNode } from "react";
import { Sidebar, SidebarSkeleton } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/cn";

/** Main layout: Collapsible Sidebar (desktop & mobile drawer) + Topbar + content. */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileOpen((v) => !v);
    } else {
      setDesktopCollapsed((prev) => !prev);
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileOpen(false);
    } else {
      setDesktopCollapsed(true);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-sidebar max-w-[82vw] bg-surface border-r border-border/70 transition-all duration-300 ease-in-out",
          mobileOpen ? "translate-x-0 shadow-card" : "-translate-x-full lg:translate-x-0",
          desktopCollapsed ? "lg:w-[72px]" : "lg:w-sidebar",
        )}
      >
        <Suspense fallback={<SidebarSkeleton isCollapsed={desktopCollapsed} />}>
          <Sidebar
            isCollapsed={desktopCollapsed}
            onToggle={handleToggle}
            onNavigate={() => setMobileOpen(false)}
            onClose={handleClose}
          />
        </Suspense>
      </aside>

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out",
          desktopCollapsed ? "lg:pl-[72px]" : "lg:pl-sidebar",
        )}
      >
        <Topbar
          onMenuClick={handleToggle}
          isSidebarCollapsed={desktopCollapsed}
        />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
