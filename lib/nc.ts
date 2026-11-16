import type { Nonconformity, NcStatus } from "./types";

/** Status shown in the UI: the stored status, or "overdue" (derived). */
export type NcDisplayStatus = NcStatus | "overdue";

export const NC_DISPLAY_STATUSES: NcDisplayStatus[] = [
  "open",
  "in_progress",
  "overdue",
  "pending_verification",
  "closed",
];

/** Today's date (YYYY-MM-DD) in Thailand time. */
export function todayInBangkok(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
}

/**
 * Overdue = a CAR due date has passed while the department still has work to do
 * (Open / In Progress). Pending verification and Closed are never overdue.
 */
export function isOverdue(nc: Pick<Nonconformity, "car" | "status">, today: string): boolean {
  if (!nc.car || (nc.status !== "open" && nc.status !== "in_progress")) return false;
  return nc.car.dueDate < today; // both YYYY-MM-DD, so string order = date order
}

export function displayStatus(nc: Pick<Nonconformity, "car" | "status">, today: string): NcDisplayStatus {
  return isOverdue(nc, today) ? "overdue" : nc.status;
}

/** Employees of the department can work on a CAR only after it is issued and before verification. */
export function canDepartmentUpdate(nc: Pick<Nonconformity, "car" | "status">): boolean {
  return !!nc.car && (nc.status === "open" || nc.status === "in_progress");
}

/** Next running number, e.g. nextNumber("NC", ["NC-2026-004"], "2026") → "NC-2026-005". */
export function nextNumber(prefix: string, existing: string[], year: string): string {
  const re = new RegExp(String.raw`^${prefix}-${year}-(\d+)$`);
  const max = existing.reduce((m, n) => {
    const hit = re.exec(n);
    return hit ? Math.max(m, Number(hit[1])) : m;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
}

/** YYYY-MM-DD and a real calendar date. */
export function isValidDateOnly(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}
