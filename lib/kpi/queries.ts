import { connection } from "next/server";
import { readDb } from "@/lib/db";
import { evaluateKpi, type KpiResult } from "@/lib/kpi";
import type { Kpi, User } from "@/lib/types";

export type KpiView = Kpi & { standardLabel: string; result: KpiResult };
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
    .map((k) => ({ ...k, standardLabel: label(k.standardId), result: evaluateKpi(k) }));
  const standards: StandardOption[] = db.standards.map((s) => ({ id: s.id, label: label(s.id) }));
  return { kpis, standards };
}
