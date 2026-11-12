import { connection } from "next/server";
import { departments } from "@/data/departments";
import { readDb } from "@/lib/db";
import { evaluateKpi } from "@/lib/kpi";
import { isOverdue, todayInBangkok } from "@/lib/nc";
import { riskLevel, riskScore } from "@/lib/risks";
import { trainingHealth } from "@/lib/training";

export type StandardReportRow = {
  id: string;
  code: string;
  name: string;
  requirementsCount: number;
  checklistsCount: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  compliancePct: number;
};

export type DepartmentReportRow = {
  id: string;
  name: string;
  requirementsCount: number;
  checklistsCount: number;
  passedCount: number;
  compliancePct: number;
  openNcCount: number;
  overdueNcCount: number;
  highRiskCount: number;
  kpiMetCount: number;
  kpiTotalCount: number;
  trainingCompletedCount: number;
  trainingTotalCount: number;
};

export async function getIsoReportSummary() {
  await connection();
  const db = await readDb();
  const today = todayInBangkok();

  const totalChecklists = db.checklists.length;
  const passedChecklists = db.checklists.filter((c) => c.results[0]?.passed === true).length;
  const failedChecklists = db.checklists.filter((c) => c.results[0]?.passed === false).length;
  const pendingChecklists = totalChecklists - passedChecklists - failedChecklists;
  const compliancePct = totalChecklists > 0 ? Math.round((passedChecklists / totalChecklists) * 100) : 0;

  const openNcs = db.nonconformities.filter((n) => n.status !== "closed").length;
  const closedNcs = db.nonconformities.length - openNcs;
  const overdueNcs = db.nonconformities.filter((n) => isOverdue(n, today)).length;

  const highRisks = db.risks.filter((r) => {
    const lv = riskLevel(riskScore(r.likelihood, r.impact));
    return lv === "high" || lv === "critical";
  }).length;
  const closedOrMonitoredRisks = db.risks.filter((r) => r.status === "monitored" || r.status === "closed").length;

  const kpiMet = db.kpis.filter((k) => evaluateKpi(k).status === "achieved").length;
  const trainingValid = db.training.filter((tr) => trainingHealth(tr, today) === "valid").length;
  const publishedDocs = db.documents.filter((d) => !d.cancelled && d.versions.some((v) => v.status === "published")).length;

  const byStandard: StandardReportRow[] = db.standards.map((s) => {
    const items = db.checklists.filter((c) => c.standardId === s.id);
    const passed = items.filter((c) => c.results[0]?.passed === true).length;
    const failed = items.filter((c) => c.results[0]?.passed === false).length;
    const pending = items.length - passed - failed;
    return {
      id: s.id,
      code: `${s.code}:${s.version}`,
      name: s.name,
      requirementsCount: db.requirements.filter((r) => r.standardId === s.id).length,
      checklistsCount: items.length,
      passedCount: passed,
      failedCount: failed,
      pendingCount: pending,
      compliancePct: items.length > 0 ? Math.round((passed / items.length) * 100) : 0,
    };
  });

  const byDepartment: DepartmentReportRow[] = departments.map((d) => {
    const items = db.checklists.filter((c) => c.departmentId === d.id);
    const passed = items.filter((c) => c.results[0]?.passed === true).length;
    const deptNcs = db.nonconformities.filter((n) => n.departmentId === d.id);
    const deptRisks = db.risks.filter((r) => r.departmentId === d.id);
    const deptKpis = db.kpis.filter((k) => k.departmentId === d.id);
    const deptTraining = db.training.filter((tr) => tr.departmentId === d.id);

    return {
      id: d.id,
      name: d.name,
      requirementsCount: db.requirements.filter((r) => r.departmentId === d.id).length,
      checklistsCount: items.length,
      passedCount: passed,
      compliancePct: items.length > 0 ? Math.round((passed / items.length) * 100) : 0,
      openNcCount: deptNcs.filter((n) => n.status !== "closed").length,
      overdueNcCount: deptNcs.filter((n) => isOverdue(n, today)).length,
      highRiskCount: deptRisks.filter((r) => {
        const lv = riskLevel(riskScore(r.likelihood, r.impact));
        return (lv === "high" || lv === "critical") && r.status !== "closed";
      }).length,
      kpiMetCount: deptKpis.filter((k) => evaluateKpi(k).status === "achieved").length,
      kpiTotalCount: deptKpis.length,
      trainingCompletedCount: deptTraining.filter((tr) => tr.status === "completed").length,
      trainingTotalCount: deptTraining.length,
    };
  });

  return {
    generatedAt: today,
    orgName: db.settings.orgName,
    isoScope: db.settings.isoScope,
    overview: {
      standardsCount: db.standards.length,
      requirementsCount: db.requirements.length,
      totalChecklists,
      passedChecklists,
      failedChecklists,
      pendingChecklists,
      compliancePct,
      totalDocs: db.documents.length,
      publishedDocs,
      totalNcs: db.nonconformities.length,
      openNcs,
      closedNcs,
      overdueNcs,
      totalRisks: db.risks.length,
      highRisks,
      closedOrMonitoredRisks,
      totalKpis: db.kpis.length,
      kpiMet,
      totalTraining: db.training.length,
      trainingValid,
    },
    byStandard,
    byDepartment,
  };
}
