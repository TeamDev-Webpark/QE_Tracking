import type { ChecklistItem, RequirementStatus } from "./types";

export const REQUIREMENT_STATUSES: RequirementStatus[] = [
  "compliant",
  "non_compliant",
  "in_progress",
  "not_checked",
  "not_linked",
];

export type ResultSummary = { total: number; passed: number; failed: number; notChecked: number };

/** Count the latest result of each linked checklist. */
export function summarizeChecklists(linked: ChecklistItem[]): ResultSummary {
  const latest = linked.map((c) => c.results[0]);
  const passed = latest.filter((r) => r?.passed === true).length;
  const failed = latest.filter((r) => r?.passed === false).length;
  return { total: linked.length, passed, failed, notChecked: linked.length - passed - failed };
}

/**
 * Requirement status rules:
 * - no linked checklist        → not_linked
 * - any latest result failed   → non_compliant
 * - all checked and passed     → compliant
 * - nothing checked yet        → not_checked
 * - otherwise (partly checked) → in_progress
 */
export function requirementStatus(s: ResultSummary): RequirementStatus {
  if (s.total === 0) return "not_linked";
  if (s.failed > 0) return "non_compliant";
  if (s.passed === s.total) return "compliant";
  if (s.passed === 0) return "not_checked";
  return "in_progress";
}

export type RequirementFilter = {
  query: string; // matches number, name or description (case-insensitive)
  departmentId: string; // "" = all
  status: RequirementStatus | ""; // "" = all
};

/** Apply search text + department + status filters. */
export function filterRequirements<
  T extends { number: string; name: string; description: string; departmentId: string; status: RequirementStatus },
>(rows: T[], f: RequirementFilter): T[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!q || [r.number, r.name, r.description].some((v) => v.toLowerCase().includes(q))) &&
      (!f.departmentId || r.departmentId === f.departmentId) &&
      (!f.status || r.status === f.status),
  );
}
