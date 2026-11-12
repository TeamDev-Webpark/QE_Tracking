import type { ChecklistItem, NumericCriteria } from "./types";

/**
 * Compare an inspection value with the item's rule.
 * - pass_fail: the value itself (true = Pass)
 * - numeric:   value must satisfy the criteria (bounds are inclusive)
 */
export function evaluateChecklist(item: Pick<ChecklistItem, "type" | "criteria">, value: boolean | number): boolean {
  if (item.type === "pass_fail") return value === true;
  if (typeof value !== "number" || !Number.isFinite(value) || !item.criteria) return false;
  return evaluateNumeric(item.criteria, value);
}

export function evaluateNumeric(c: NumericCriteria, value: number): boolean {
  switch (c.operator) {
    case "gte":
      return c.min !== undefined && value >= c.min;
    case "lte":
      return c.max !== undefined && value <= c.max;
    case "between":
      return c.min !== undefined && c.max !== undefined && value >= c.min && value <= c.max;
  }
}

const num = (n: number | undefined) => (n === undefined ? "?" : n.toLocaleString("en-US"));

/** Human-readable rule, e.g. "≥ 20 °C", "≤ 2 %", "20 – 25 °C". */
export function formatCriteria(c: NumericCriteria): string {
  const unit = c.unit ? ` ${c.unit}` : "";
  switch (c.operator) {
    case "gte":
      return `≥ ${num(c.min)}${unit}`;
    case "lte":
      return `≤ ${num(c.max)}${unit}`;
    case "between":
      return `${num(c.min)} – ${num(c.max)}${unit}`;
  }
}
