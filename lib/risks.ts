import { todayInBangkok } from "./nc";
import type { RiskLevel } from "./types";

export function riskScore(likelihood: number, impact: number): number {
  return Math.max(1, Math.min(25, Math.round(likelihood) * Math.round(impact)));
}

export function riskLevel(score: number): RiskLevel {
  if (score >= 17) return "critical";
  if (score >= 10) return "high";
  if (score >= 5) return "medium";
  return "low";
}

export function nextRiskCode(codes: string[], year = todayInBangkok().slice(0, 4)): string {
  const prefix = `RSK-${year}-`;
  let max = 0;
  for (const c of codes) {
    if (!c.startsWith(prefix)) continue;
    const n = Number(c.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}
