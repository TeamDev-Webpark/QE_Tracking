"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { departments } from "@/data/departments";
import { auditEntry, diffFields } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { evaluateChecklist, formatCriteria } from "@/lib/checklist";
import { readDb, updateDb } from "@/lib/db";
import type { ChecklistType, NumericCriteria } from "@/lib/types";

export type FieldError =
  | "required"
  | "duplicate"
  | "invalidNumber"
  | "minGreaterThanMax"
  | "invalidDate"
  | "futureDate";

export type ActionResult =
  | { ok: true }
  | { ok: false; error?: "forbidden" | "notFound"; fieldErrors?: Record<string, FieldError> };

const forbidden: ActionResult = { ok: false, error: "forbidden" };
const notFound: ActionResult = { ok: false, error: "notFound" };

async function requireAdmin() {
  const user = await getSessionUser();
  return user?.role === "admin" || user?.role === "qe" ? user : undefined;
}

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

/* ---------------- ISO Standards ---------------- */

export type StandardInput = { code: string; version: string; name: string; description: string };

function validateStandard(input: StandardInput) {
  const data = {
    code: clean(input.code),
    version: clean(input.version),
    name: clean(input.name),
    description: clean(input.description),
  };
  const fieldErrors: Record<string, FieldError> = {};
  if (!data.code) fieldErrors.code = "required";
  if (!data.version) fieldErrors.version = "required";
  if (!data.name) fieldErrors.name = "required";
  return { data, fieldErrors };
}

/** Create (id undefined) or update a standard. Admin only. */
export async function saveStandard(id: string | undefined, input: StandardInput): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!user) return forbidden;
  const { data, fieldErrors } = validateStandard(input);

  const db = await readDb();
  if (id && !db.standards.some((s) => s.id === id)) return notFound;
  const duplicate = db.standards.some(
    (s) => s.id !== id && s.code.toLowerCase() === data.code.toLowerCase() && s.version === data.version,
  );
  if (data.code && data.version && duplicate) fieldErrors.code = "duplicate";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  await updateDb((db) => {
    const fields = ["code", "version", "name", "description"] as const;
    const entity = { type: "standard" as const, label: `${data.code}:${data.version}` };
    if (id) {
      const s = db.standards.find((s) => s.id === id)!;
      const changes = diffFields(s, data, [...fields]);
      Object.assign(s, data);
      db.auditLog.push(auditEntry(user, "update", { ...entity, id }, { changes }));
    } else {
      const newId = randomUUID();
      db.standards.push({ id: newId, ...data });
      db.auditLog.push(auditEntry(user, "create", { ...entity, id: newId }, { changes: diffFields(undefined, data, [...fields]) }));
    }
  });
  refresh();
  return { ok: true };
}

/** Delete an ISO standard together with its checklists and requirements. Admin / QE only. */
export async function deleteStandard(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!user) return forbidden;
  const db = await readDb();
  const target = db.standards.find((s) => s.id === id);
  if (!target) return notFound;

  await updateDb((db) => {
    const removedChecklists = db.checklists.filter((c) => c.standardId === id).length;
    const removedRequirements = db.requirements.filter((r) => r.standardId === id).length;
    db.auditLog.push(
      auditEntry(user, "delete", { type: "standard", id, label: `${target.code}:${target.version}` }, {
        note: `checklists: ${removedChecklists}, requirements: ${removedRequirements}`,
      }),
    );
    db.standards = db.standards.filter((s) => s.id !== id);
    db.checklists = db.checklists.filter((c) => c.standardId !== id);
    db.requirements = db.requirements.filter((r) => r.standardId !== id);
  });
  refresh();
  return { ok: true };
}

/* ---------------- Checklist items ---------------- */

export type ChecklistInput = {
  requirementId: string;
  previousRequirementId?: string;
  clause?: string;
  title: string;
  departmentId: string;
  type: ChecklistType;
  operator?: NumericCriteria["operator"];
  min?: string;
  max?: string;
  unit?: string;
};

const toNumber = (s: string | undefined) => {
  const v = clean(s);
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

function validateChecklist(input: ChecklistInput, resolvedClause: string | undefined) {
  const fieldErrors: Record<string, FieldError> = {};
  const clause = clean(resolvedClause);
  const title = clean(input.title);
  const departmentId = clean(input.departmentId);
  const type: ChecklistType = input.type === "numeric" ? "numeric" : "pass_fail";

  if (!clause) fieldErrors.requirementId = "required";
  if (!title) fieldErrors.title = "required";
  if (!departments.some((d) => d.id === departmentId)) fieldErrors.departmentId = "required";

  let criteria: NumericCriteria | undefined;
  if (type === "numeric") {
    const operator = input.operator === "gte" || input.operator === "lte" ? input.operator : "between";
    const min = toNumber(input.min);
    const max = toNumber(input.max);
    const needMin = operator !== "lte";
    const needMax = operator !== "gte";
    if (needMin && min === undefined) fieldErrors.min = "required";
    else if (needMin && Number.isNaN(min)) fieldErrors.min = "invalidNumber";
    if (needMax && max === undefined) fieldErrors.max = "required";
    else if (needMax && Number.isNaN(max)) fieldErrors.max = "invalidNumber";
    if (operator === "between" && !fieldErrors.min && !fieldErrors.max && min! > max!) {
      fieldErrors.max = "minGreaterThanMax";
    }
    criteria = {
      operator,
      min: needMin ? min : undefined,
      max: needMax ? max : undefined,
      unit: clean(input.unit),
    };
  }

  return { data: { clause, title, departmentId, type, criteria }, fieldErrors };
}

/** Create (id undefined) or update a checklist item. Clause strictly comes from the Requirement Register. */
export async function saveChecklist(
  standardId: string,
  id: string | undefined,
  input: ChecklistInput,
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!user) return forbidden;

  const db = await readDb();
  if (!db.standards.some((s) => s.id === standardId)) return notFound;
  if (id && !db.checklists.some((c) => c.id === id && c.standardId === standardId)) return notFound;

  const reqId = clean(input.requirementId);
  const prevReqId = clean(input.previousRequirementId);
  const req = db.requirements.find((r) => r.id === reqId && r.standardId === standardId);

  const { data, fieldErrors } = validateChecklist(input, req?.number);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  await updateDb((db) => {
    // Criteria are logged as readable text, e.g. "20 – 25 °C".
    const view = (c: { clause: string; title: string; departmentId: string; type: string; criteria?: NumericCriteria }) => ({
      ...c,
      criteria: c.criteria ? formatCriteria(c.criteria) : "",
    });
    const fields = ["clause", "title", "departmentId", "type", "criteria"] as const;
    const entity = { type: "checklist" as const, label: `${data.clause} ${data.title}` };
    let targetId = id;
    if (id) {
      const item = db.checklists.find((c) => c.id === id)!;
      const changes = diffFields(view(item), view(data), [...fields]);
      Object.assign(item, data);
      db.auditLog.push(auditEntry(user, "update", { ...entity, id }, { changes }));
    } else {
      targetId = randomUUID();
      db.checklists.push({ id: targetId, standardId, ...data, results: [] });
      db.auditLog.push(auditEntry(user, "create", { ...entity, id: targetId }, { changes: diffFields(undefined, view(data), [...fields]) }));
    }

    // Keep Requirement Register link synced with selected requirement.
    if (targetId && req) {
      if (prevReqId && prevReqId !== req.id) {
        const oldReq = db.requirements.find((r) => r.id === prevReqId && r.standardId === standardId);
        if (oldReq) oldReq.checklistIds = oldReq.checklistIds.filter((cid) => cid !== targetId);
      }
      const nextReq = db.requirements.find((r) => r.id === req.id && r.standardId === standardId);
      if (nextReq && !nextReq.checklistIds.includes(targetId)) {
        nextReq.checklistIds.push(targetId);
      }
    }
  });
  refresh();
  return { ok: true };
}

/** Delete a checklist item and its results. Admin only. */
export async function deleteChecklist(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!user) return forbidden;
  const db = await readDb();
  if (!db.checklists.some((c) => c.id === id)) return notFound;

  await updateDb((db) => {
    const item = db.checklists.find((c) => c.id === id)!;
    db.auditLog.push(
      auditEntry(user, "delete", { type: "checklist", id, label: `${item.clause} ${item.title}` }, {
        note: `results: ${item.results.length}`,
      }),
    );
    db.checklists = db.checklists.filter((c) => c.id !== id);
    // Remove links from requirements (Part 4).
    for (const r of db.requirements) r.checklistIds = r.checklistIds.filter((cid) => cid !== id);
  });
  refresh();
  return { ok: true };
}

/* ---------------- Inspection results ---------------- */

export type ResultInput = { value: boolean | string; checkedAt: string; note?: string };

/** Record an inspection result. QE, ISO, and Admin only. Pass/Fail is evaluated on the server. */
export async function recordResult(checklistId: string, input: ResultInput): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return forbidden;
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  if (!isPrivileged) return forbidden;

  const db = await readDb();
  const item = db.checklists.find((c) => c.id === checklistId);
  if (!item) return notFound;

  const fieldErrors: Record<string, FieldError> = {};
  let value: boolean | number;
  if (item.type === "pass_fail") {
    if (typeof input.value !== "boolean") fieldErrors.value = "required";
    value = input.value === true;
  } else {
    const n = toNumber(typeof input.value === "string" ? input.value : undefined);
    if (n === undefined) fieldErrors.value = "required";
    else if (Number.isNaN(n)) fieldErrors.value = "invalidNumber";
    value = n ?? NaN;
  }

  const checkedAt = new Date(clean(input.checkedAt));
  if (!clean(input.checkedAt)) fieldErrors.checkedAt = "required";
  else if (Number.isNaN(checkedAt.getTime())) fieldErrors.checkedAt = "invalidDate";
  else if (checkedAt.getTime() > Date.now() + 60_000) fieldErrors.checkedAt = "futureDate";

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const note = clean(input.note);

  await updateDb((db) => {
    const target = db.checklists.find((c) => c.id === checklistId)!;
    const passed = evaluateChecklist(target, value);
    target.results.unshift({
      id: randomUUID(),
      value,
      passed,
      checkedAt: checkedAt.toISOString(),
      checkedBy: user.id,
      ...(note ? { note } : {}),
    });
    db.auditLog.push(
      auditEntry(user, "record_result", { type: "checklist", id: checklistId, label: `${target.clause} ${target.title}` }, {
        changes: [
          { field: "value", from: "", to: `${value}${target.criteria?.unit ? ` ${target.criteria.unit}` : ""}` },
          { field: "result", from: "", to: passed ? "PASS" : "FAIL" },
          { field: "checkedAt", from: "", to: checkedAt.toISOString() },
        ],
        ...(note ? { note } : {}),
      }),
    );
  });
  refresh();
  return { ok: true };
}
