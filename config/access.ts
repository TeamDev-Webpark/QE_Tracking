/**
 * Role-based access rules (single source of truth).
 * Used by the Sidebar (which menus to show) and proxy.ts (which URLs to allow).
 */
export const ROLES = ["admin", "qe", "iso", "employee"] as const;
export type Role = (typeof ROLES)[number];

export const routeAccess: Record<string, Role[]> = {
  "/": ["admin", "qe", "iso", "employee"],
  "/standards": ["admin", "qe", "iso", "employee"],
  "/requirements": ["admin", "qe", "iso", "employee"],
  "/documents": ["admin", "qe", "iso", "employee"],
  "/audits": ["admin", "qe", "iso"],
  "/corrective-actions": ["admin", "qe", "iso", "employee"],
  "/kpi": ["admin", "qe", "iso", "employee"],
  "/risks": ["admin", "qe", "iso", "employee"],
  "/training": ["admin", "qe", "iso", "employee"],
  "/audit-trail": ["admin", "qe", "iso"],
  "/reports": ["admin", "qe", "iso"],
  "/settings": ["admin", "qe"],
};

/** True when `pathname` belongs to `href` (exact match for "/"). */
export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Returns whether `role` may open `pathname`.
 * Unknown paths return true so Next.js can show its 404 page.
 */
export function canAccess(role: Role, pathname: string) {
  const match = Object.keys(routeAccess)
    .filter((href) => isActivePath(pathname, href))
    .sort((a, b) => b.length - a.length)[0];
  return match ? routeAccess[match].includes(role) : true;
}
