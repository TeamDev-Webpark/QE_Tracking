import { todayInBangkok } from "./nc";
import type { TrainingHealth, TrainingRecord } from "./types";

const EXPIRING_DAYS = 30;

export function trainingHealth(
  record: Pick<TrainingRecord, "status" | "expiryDate">,
  today = todayInBangkok(),
): TrainingHealth {
  if (record.status === "planned") return "planned";
  if (!record.expiryDate) return "valid";
  if (record.expiryDate < today) return "expired";
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + EXPIRING_DAYS);
  const soonYmd = soon.toISOString().slice(0, 10);
  if (record.expiryDate <= soonYmd) return "expiring";
  return "valid";
}

export function nextTrainingCode(codes: string[], year = todayInBangkok().slice(0, 4)): string {
  const prefix = `TRN-${year}-`;
  let max = 0;
  for (const c of codes) {
    if (!c.startsWith(prefix)) continue;
    const n = Number(c.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}
