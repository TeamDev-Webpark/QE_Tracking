import { connection } from "next/server";
import { readDb, type DemoDb } from "@/lib/db";
import { canDepartmentUpdate, displayStatus, todayInBangkok, type NcDisplayStatus } from "@/lib/nc";
import type { RequirementClauseOption } from "@/lib/standards/queries";
import type { ChecklistResult, ChecklistType, Nonconformity, NumericCriteria, User } from "@/lib/types";

export type SourceChecklistInfo = {
  title: string;
  type: ChecklistType;
  criteria?: NumericCriteria;
  unit?: string;
  latest?: ChecklistResult;
};

export type NcView = Nonconformity & {
  standardLabel: string;
  displayStatus: NcDisplayStatus;
  canUpdate: boolean; // current user may record plan / progress / submit
};

/** A checklist item whose latest result failed and has no active NC yet. */
export type FailedCandidate = {
  checklistId: string;
  standardLabel: string;
  clause: string;
  title: string;
  departmentId: string;
  latest: ChecklistResult;
  unit?: string;
};

export type StandardOption = { id: string; label: string };
export type NcRequirementOption = RequirementClauseOption & { standardId: string };

const label = (db: DemoDb, id: string) => {
  const s = db.standards.find((s) => s.id === id);
  return s ? `${s.code}:${s.version}` : "-";
};

function toView(nc: Nonconformity, db: DemoDb, user: User, today: string): NcView {
  return {
    ...nc,
    standardLabel: label(db, nc.standardId),
    displayStatus: displayStatus(nc, today),
    canUpdate: user.role === "employee" && user.departmentId === nc.departmentId && canDepartmentUpdate(nc),
  };
}

/** Admin & Auditor: every NC. Employee: NCs of their own department. */
const visible = (nc: Nonconformity, user: User) =>
  user.role === "admin" || user.role === "qe" || user.role === "iso" || nc.departmentId === user.departmentId;

/** Call only inside <Suspense>. */
export async function getNcList(user: User) {
  await connection();
  const today = todayInBangkok();
  const db = await readDb();
  const isAuditorOrAdmin = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const items = db.nonconformities
    .filter((nc) => visible(nc, user))
    .map((nc) => toView(nc, db, user, today))
    .sort((a, b) => b.number.localeCompare(a.number));

  let candidates: FailedCandidate[] = [];
  if (isAuditorOrAdmin) {
    const active = new Set(
      db.nonconformities.filter((nc) => nc.status !== "closed" && nc.checklist).map((nc) => nc.checklist!.checklistId),
    );
    candidates = db.checklists
      .filter((c) => c.results[0]?.passed === false && !active.has(c.id))
      .map((c) => ({
        checklistId: c.id,
        standardLabel: label(db, c.standardId),
        clause: c.clause,
        title: c.title,
        departmentId: c.departmentId,
        latest: c.results[0],
        unit: c.criteria?.unit,
      }));
  }

  const standards: StandardOption[] = db.standards.map((s) => ({ id: s.id, label: label(db, s.id) }));
  const requirements: NcRequirementOption[] = db.requirements.map((r) => ({
    id: r.id,
    standardId: r.standardId,
    number: r.number,
    name: r.name,
    departmentId: r.departmentId,
    checklistIds: r.checklistIds,
  }));
  return { items, candidates, standards, requirements, today };
}

/** One NC (undefined if missing or not visible). Call only inside <Suspense>. */
export async function getNcDetail(id: string, user: User) {
  await connection();
  const today = todayInBangkok();
  const db = await readDb();
  const nc = db.nonconformities.find((n) => n.id === id);
  if (!nc || !visible(nc, user)) return undefined;

  // Current state of the source checklist — shown next to the original snapshot.
  const source = nc.checklist ? db.checklists.find((c) => c.id === nc.checklist!.checklistId) : undefined;
  const sourceChecklist: SourceChecklistInfo | undefined = source
    ? {
        title: source.title,
        type: source.type,
        criteria: source.criteria,
        unit: source.criteria?.unit,
        latest: source.results[0] as ChecklistResult | undefined,
      }
    : undefined;
  return {
    nc: toView(nc, db, user, today),
    sourceChecklist,
    today,
  };
}
