import { connection } from "next/server";
import { readDb } from "@/lib/db";
import { requirementStatus, summarizeChecklists, type ResultSummary } from "@/lib/requirements";
import type { Requirement, RequirementStatus } from "@/lib/types";

export type RequirementRow = Requirement & {
  standardLabel: string; // e.g. "ISO 9001:2015"
  summary: ResultSummary;
  status: RequirementStatus;
};

/** Checklist item as shown in the link picker. */
export type ChecklistOption = {
  id: string;
  standardId: string;
  clause: string;
  title: string;
  departmentId: string;
  lastPassed?: boolean; // latest result, undefined = not checked
};

export type StandardOption = { id: string; label: string };

/** Everything the Requirement Register page needs. Call only inside <Suspense>. */
export async function getRequirementRegister(departmentId?: string) {
  await connection();
  const db = await readDb();
  const label = (id: string) => {
    const s = db.standards.find((s) => s.id === id);
    return s ? `${s.code}:${s.version}` : "-";
  };

  const scopedRequirements = departmentId
    ? db.requirements.filter((r) => r.departmentId === departmentId)
    : db.requirements;

  const scopedChecklists = departmentId
    ? db.checklists.filter((c) => c.departmentId === departmentId)
    : db.checklists;

  const rows: RequirementRow[] = scopedRequirements.map((r) => {
    const linked = scopedChecklists.filter((c) => r.checklistIds.includes(c.id));
    const summary = summarizeChecklists(linked);
    return { ...r, standardLabel: label(r.standardId), summary, status: requirementStatus(summary) };
  });

  const standards: StandardOption[] = db.standards.map((s) => ({ id: s.id, label: label(s.id) }));

  const checklists: ChecklistOption[] = scopedChecklists.map((c) => ({
    id: c.id,
    standardId: c.standardId,
    clause: c.clause,
    title: c.title,
    departmentId: c.departmentId,
    lastPassed: c.results[0]?.passed,
  }));

  return { rows, standards, checklists };
}
