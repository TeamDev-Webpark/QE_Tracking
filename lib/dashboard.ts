import type { ChecklistResult, ChecklistType, NumericCriteria } from "./types";

/** One checklist item with everything the dashboard shows. */
export type InspectionItem = {
  id: string;
  standardId: string;
  standardLabel: string; // e.g. "ISO 9001:2015"
  clause: string;
  title: string;
  departmentId: string;
  type: ChecklistType;
  criteria?: NumericCriteria;
  results: ChecklistResult[]; // newest first
};

export type ResultState = "pass" | "fail" | "not_checked";

/** State of an item = its latest result. */
export function itemState(item: Pick<InspectionItem, "results">): ResultState {
  const latest = item.results[0];
  if (!latest) return "not_checked";
  return latest.passed ? "pass" : "fail";
}

export type Summary = {
  total: number;
  passed: number;
  failed: number;
  notChecked: number;
  checked: number;
  /** Passed ÷ checked × 100 (1 decimal). null when nothing is checked yet. */
  compliance: number | null;
};

export function summarize(items: Pick<InspectionItem, "results">[]): Summary {
  let passed = 0;
  let failed = 0;
  for (const item of items) {
    const s = itemState(item);
    if (s === "pass") passed++;
    else if (s === "fail") failed++;
  }
  const checked = passed + failed;
  return {
    total: items.length,
    passed,
    failed,
    notChecked: items.length - checked,
    checked,
    compliance: checked === 0 ? null : Math.round((passed / checked) * 1000) / 10,
  };
}

/** Summaries per group, in first-seen order of `keyOf`. */
export function groupSummaries<T extends Pick<InspectionItem, "results">>(
  items: T[],
  keyOf: (item: T) => string,
): { key: string; summary: Summary }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups].map(([key, list]) => ({ key, summary: summarize(list) }));
}
