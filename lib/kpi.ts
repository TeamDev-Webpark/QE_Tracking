import type { Kpi } from "./types";

export type KpiStatus = "achieved" | "not_achieved" | "no_data";

export type KpiResult = {
  status: KpiStatus;
  /** actual − target (null without data). */
  variance: number | null;
  /** % of target reached, 1 decimal. higher: actual ÷ target; lower: target ÷ actual. */
  achievement: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Compare Actual with Target. Equal to target counts as achieved. */
export function evaluateKpi(kpi: Pick<Kpi, "target" | "actual" | "direction">): KpiResult {
  const { target, actual, direction } = kpi;
  if (actual === null || !Number.isFinite(actual)) return { status: "no_data", variance: null, achievement: null };

  const achieved = direction === "higher" ? actual >= target : actual <= target;
  let achievement: number;
  if (direction === "higher") achievement = target === 0 ? 100 : (actual / target) * 100;
  else if (actual === 0) achievement = 100; // nothing happened = best possible for "lower is better"
  else achievement = (target / actual) * 100;

  return {
    status: achieved ? "achieved" : "not_achieved",
    variance: round1(actual - target),
    achievement: round1(Math.max(0, achievement)),
  };
}
