import type { InternalAudit } from "./types";
import { todayInBangkok } from "./nc";

export type AuditFindingSummary = {
  total: number;
  conforming: number;
  observation: number;
  nonconforming: number;
  pending: number;
};

export function summarizeAuditFindings(findings: InternalAudit["findings"]): AuditFindingSummary {
  let conforming = 0;
  let observation = 0;
  let nonconforming = 0;
  let pending = 0;
  for (const f of findings) {
    if (f.result === "conforming") conforming++;
    else if (f.result === "observation") observation++;
    else if (f.result === "nonconforming") nonconforming++;
    else pending++;
  }
  return { total: findings.length, conforming, observation, nonconforming, pending };
}

export function isAuditOverdue(audit: Pick<InternalAudit, "status" | "scheduledDate">, today = todayInBangkok()): boolean {
  return audit.status !== "completed" && !!audit.scheduledDate && audit.scheduledDate < today;
}

export function nextAuditCode(codes: string[], year = todayInBangkok().slice(0, 4)): string {
  const prefix = `IA-${year}-`;
  let max = 0;
  for (const c of codes) {
    if (!c.startsWith(prefix)) continue;
    const n = Number(c.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}
