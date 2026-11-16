import { connection } from "next/server";
import { readDb } from "@/lib/db";
import type { InspectionItem } from "@/lib/dashboard";
import { documentStatus, isVisibleToEmployee } from "@/lib/documents";
import { evaluateKpi, type KpiStatus } from "@/lib/kpi";
import { displayStatus, NC_DISPLAY_STATUSES, todayInBangkok, type NcDisplayStatus } from "@/lib/nc";
import type { DocumentStatus, User } from "@/lib/types";

/**
 * Inspection items for the dashboard. Pass `departmentId` to scope the data
 * (Employee sees only their own department). Call only inside <Suspense>.
 */
export async function getInspectionItems(departmentId?: string): Promise<InspectionItem[]> {
  await connection();
  const db = await readDb();
  const order = new Map(db.standards.map((s, i) => [s.id, i]));

  return db.checklists
    .filter((c) => !departmentId || c.departmentId === departmentId)
    .filter((c) => order.has(c.standardId))
    .sort((a, b) => order.get(a.standardId)! - order.get(b.standardId)!)
    .map((c) => {
      const s = db.standards.find((s) => s.id === c.standardId)!;
      return {
        id: c.id,
        standardId: c.standardId,
        standardLabel: `${s.code}:${s.version}`,
        clause: c.clause,
        title: c.title,
        departmentId: c.departmentId,
        type: c.type,
        criteria: c.criteria,
        results: c.results,
      };
    });
}

/* ---------- Overview cards (NC/CAR · KPI · Documents) ---------- */

export type OverdueCar = { id: string; number: string; title: string; departmentId: string; dueDate: string; days: number };
export type MissedKpi = { id: string; name: string; actual: number; target: number; unit: string; departmentId: string };

export type AuditInspectionSummary = {
  totalPlans: number;
  completedPlans: number;
  inProgressPlans: number;
  totalFindings: number;
  conformingFindings: number;
  observationFindings: number;
  ncFindings: number;
  passRate: number;
};

export type Overview = {
  nc: { counts: Record<NcDisplayStatus, number>; overdue: OverdueCar[] };
  kpi: { counts: Record<KpiStatus, number>; missed: MissedKpi[] };
  /** Employee: only published documents are counted (drafts and cancelled are hidden from them). */
  docs: { counts: Record<DocumentStatus, number> };
  auditSummary: AuditInspectionSummary;
};

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** Overview for the dashboard, scoped like each module's own page. Call only inside <Suspense>. */
export async function getOverview(user: User): Promise<Overview> {
  await connection();
  const db = await readDb();
  const today = todayInBangkok();
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const mine = (departmentId: string) => isPrivileged || departmentId === user.departmentId;

  const ncCounts = Object.fromEntries(NC_DISPLAY_STATUSES.map((s) => [s, 0])) as Record<NcDisplayStatus, number>;
  const overdue: OverdueCar[] = [];
  for (const nc of db.nonconformities.filter((n) => mine(n.departmentId))) {
    const status = displayStatus(nc, today);
    ncCounts[status]++;
    if (status === "overdue" && nc.car) {
      overdue.push({
        id: nc.id,
        number: nc.number,
        title: nc.title,
        departmentId: nc.departmentId,
        dueDate: nc.car.dueDate,
        days: daysBetween(nc.car.dueDate, today),
      });
    }
  }
  overdue.sort((a, b) => b.days - a.days);

  const kpiCounts: Record<KpiStatus, number> = { achieved: 0, not_achieved: 0, no_data: 0 };
  const missed: MissedKpi[] = [];
  for (const k of db.kpis.filter((k) => mine(k.departmentId))) {
    const { status } = evaluateKpi(k);
    kpiCounts[status]++;
    if (status === "not_achieved" && k.actual !== null) {
      missed.push({ id: k.id, name: k.name, actual: k.actual, target: k.target, unit: k.unit, departmentId: k.departmentId });
    }
  }

  const docCounts: Record<DocumentStatus, number> = { published: 0, draft: 0, cancelled: 0 };
  for (const d of db.documents.filter((doc) => mine(doc.departmentId))) {
    const status = documentStatus(d);
    if (isPrivileged || isVisibleToEmployee(d)) docCounts[status]++;
  }

  // Audits summary (สุ่มตรวจข้ามแผนก)
  const userAudits = db.audits.filter((a) => mine(a.departmentId));
  let totalFindings = 0;
  let conformingFindings = 0;
  let observationFindings = 0;
  let ncFindings = 0;

  for (const a of userAudits) {
    for (const f of a.findings) {
      totalFindings++;
      if (f.result === "conforming") conformingFindings++;
      else if (f.result === "observation") observationFindings++;
      else if (f.result === "nonconforming") ncFindings++;
    }
  }

  const passRate = totalFindings > 0 ? Math.round((conformingFindings / totalFindings) * 100) : 0;
  const auditSummary: AuditInspectionSummary = {
    totalPlans: userAudits.length,
    completedPlans: userAudits.filter((a) => a.status === "completed").length,
    inProgressPlans: userAudits.filter((a) => a.status === "in_progress").length,
    totalFindings,
    conformingFindings,
    observationFindings,
    ncFindings,
    passRate,
  };

  return {
    nc: { counts: ncCounts, overdue },
    kpi: { counts: kpiCounts, missed },
    docs: { counts: docCounts },
    auditSummary,
  };
}
