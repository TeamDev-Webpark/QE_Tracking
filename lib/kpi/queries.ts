import { connection } from "next/server";
import { seedKpis } from "@/data/kpis";
import { readDb } from "@/lib/db";
import { evaluateKpi, type KpiResult } from "@/lib/kpi";
import type { Kpi, KpiHistoryEntry, User } from "@/lib/types";

export type KpiView = Kpi & {
  standardLabel: string;
  result: KpiResult;
  history: KpiHistoryEntry[];
};
export type StandardOption = { id: string; label: string };

/** Admin: every KPI. Employee: KPIs of their own department. Call only inside <Suspense>. */
export async function getKpis(user: User) {
  await connection();
  const db = await readDb();
  const label = (id: string) => {
    const s = db.standards.find((s) => s.id === id);
    return s ? `${s.code}:${s.version}` : "";
  };
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const kpis: KpiView[] = db.kpis
    .filter((k) => isPrivileged || k.departmentId === user.departmentId)
    .map((k) => {
      const seedHistory = seedKpis.find((sk) => sk.id === k.id)?.history;
      const rawHistory = k.history?.length
        ? [...k.history]
        : seedHistory?.length
          ? structuredClone(seedHistory)
          : [{ period: k.period, target: k.target, actual: k.actual, updatedAt: k.updatedAt, updatedBy: k.updatedBy }];
      // Ensure current k.period entry is up-to-date in history
      const idx = rawHistory.findIndex((h) => h.period === k.period);
      if (idx >= 0) {
        rawHistory[idx] = { ...rawHistory[idx], target: k.target, actual: k.actual };
      } else {
        rawHistory.push({ period: k.period, target: k.target, actual: k.actual, updatedAt: k.updatedAt, updatedBy: k.updatedBy });
      }
      rawHistory.sort((a, b) => a.period.localeCompare(b.period));
      return {
        ...k,
        history: rawHistory,
        standardLabel: label(k.standardId),
        result: evaluateKpi(k),
      };
    });
  const standards: StandardOption[] = db.standards.map((s) => ({ id: s.id, label: label(s.id) }));
  return { kpis, standards };
}
