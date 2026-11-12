"use client";

import { useEffect, useRef, useState } from "react";
import { logout } from "@/lib/auth/actions";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { ChevronDownIcon, LogoutIcon } from "@/components/icons";
import { Badge } from "@/components/ui";
import { departmentName } from "@/lib/format";
import { displayName } from "@/lib/user";

/** Topbar user profile: avatar + name, opens a dropdown with details and Logout. */
export function UserMenu() {
  const user = useSessionUser();
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = displayName(user, lang);
  const dept = departmentName(user.departmentId, lang);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.profile.userMenu}
        className="flex items-center gap-3 rounded-control p-1 hover:bg-page"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {name.charAt(0)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-bold">{name}</span>
          <span className="block text-xs text-text-muted">
            {dept} · {t.roles[user.role]}
          </span>
        </span>
        <ChevronDownIcon width={16} height={16} className="hidden text-text-muted sm:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-card border border-border/60 bg-surface p-4 shadow-card"
        >
          <p className="font-bold">{name}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted">{t.profile.position}</dt>
              <dd>{user.position}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted">{t.profile.department}</dt>
              <dd>{user.department}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-muted">{t.profile.role}</dt>
              <dd>
                <Badge tone={user.role === "qe" || user.role === "admin" ? "primary" : user.role === "iso" ? "warning" : "success"}>
                  {t.roles[user.role]}
                </Badge>
              </dd>
            </div>
          </dl>
          <form action={logout} className="mt-4 border-t border-border/60 pt-3">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-control px-2 py-2 text-sm font-semibold text-danger hover:bg-danger-soft"
            >
              <LogoutIcon width={18} height={18} />
              {t.profile.logout}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
