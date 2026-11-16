"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { getUserById } from "@/data";
import { departments } from "@/data/departments";
import { auditEntry, diffFields } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { evaluateNumeric } from "@/lib/checklist";
import { readDb, updateDb } from "@/lib/db";
import { canDepartmentUpdate, isValidDateOnly, nextNumber, todayInBangkok } from "@/lib/nc";
import type { NcEvent, Nonconformity, User } from "@/lib/types";

export type NcFieldError = "required" | "invalidNumber" | "outOfRange" | "invalidDate" | "pastDate";
export type NcError = "forbidden" | "notFound" | "invalidState" | "incomplete" | "ncExists";
export type NcResult = { ok: true; id?: string } | { ok: false; error?: NcError; fieldErrors?: Record<string, NcFieldError> };

const fail = (error: NcError): NcResult => ({ ok: false, error });
const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");
const now = () => new Date().toISOString();

async function requireAdmin() {
  const user = await getSessionUser();
  return user?.role === "admin" || user?.role === "qe" || user?.role === "iso" ? user : undefined;
}

/** Employee of the NC's department, while the CAR is open for work. */
async function requireDepartmentMember(nc: Nonconformity): Promise<User | NcResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "employee" || user.departmentId !== nc.departmentId) return fail("forbidden");
  if (!canDepartmentUpdate(nc)) return fail("invalidState");
  return user;
}

const event = (by: string, type: NcEvent["type"], extra: Partial<NcEvent> = {}): NcEvent => ({ at: now(), by, type, ...extra });

/* ---------------- Admin: create ---------------- */

export type NcInput = { title: string; description: string; standardId: string; clause: string; departmentId: string };

/** Create an NC manually. Admin only. */
export async function createNc(input: NcInput): Promise<NcResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const data = {
    title: clean(input.title),
    description: clean(input.description),
    standardId: clean(input.standardId),
    clause: clean(input.clause),
    departmentId: clean(input.departmentId),
  };
  const fieldErrors: Record<string, NcFieldError> = {};
  if (!data.title) fieldErrors.title = "required";
  if (!data.description) fieldErrors.description = "required";
  if (!db.standards.some((s) => s.id === data.standardId)) fieldErrors.standardId = "required";
  if (!departments.some((d) => d.id === data.departmentId)) fieldErrors.departmentId = "required";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const id = randomUUID();
  await updateDb((db) => {
    const number = nextNumber("NC", db.nonconformities.map((n) => n.number), todayInBangkok().slice(0, 4));
    db.auditLog.push(
      auditEntry(user, "create", { type: "nc", id, label: number }, {
        changes: diffFields(undefined, data, ["title", "description", "standardId", "clause", "departmentId"]),
        note: "manual",
      }),
    );
    db.nonconformities.push({
      id,
      number,
      ...data,
      source: "manual",
      rootCause: "",
      correctiveAction: "",
      progress: 0,
      status: "open",
      events: [event(user.id, "created")],
      createdAt: now(),
      createdBy: user.id,
    });
  });
  refresh();
  return { ok: true, id };
}

/**
 * Create an NC from a checklist item whose latest result failed.
 * The failed result is copied as a snapshot and is never changed by the NC. Admin only.
 */
export async function createNcFromChecklist(checklistId: string): Promise<NcResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const item = db.checklists.find((c) => c.id === checklistId);
  if (!item) return fail("notFound");
  const latest = item.results[0];
  if (!latest || latest.passed) return fail("invalidState");
  if (db.nonconformities.some((n) => n.status !== "closed" && n.checklist?.checklistId === checklistId)) {
    return fail("ncExists");
  }

  const unit = item.criteria?.unit ? ` ${item.criteria.unit}` : "";
  const valueText = typeof latest.value === "number" ? ` (${latest.value}${unit})` : "";
  const id = randomUUID();
  await updateDb((db) => {
    const number = nextNumber("NC", db.nonconformities.map((n) => n.number), todayInBangkok().slice(0, 4));
    db.auditLog.push(
      auditEntry(user, "create", { type: "nc", id, label: number }, {
        changes: [
          { field: "title", from: "", to: `${item.title}${valueText}` },
          { field: "departmentId", from: "", to: item.departmentId },
        ],
        note: `checklist ${item.clause} (${latest.checkedAt})`,
      }),
    );
    db.nonconformities.push({
      id,
      number,
      title: `${item.title}${valueText}`,
      description: `ผลตรวจข้อ ${item.clause} ไม่ผ่านเกณฑ์${valueText}`,
      standardId: item.standardId,
      clause: item.clause,
      departmentId: item.departmentId,
      source: "checklist",
      checklist: { checklistId, resultId: latest.id, value: latest.value, checkedAt: latest.checkedAt },
      rootCause: "",
      correctiveAction: "",
      progress: 0,
      status: "open",
      events: [event(user.id, "created")],
      createdAt: now(),
      createdBy: user.id,
    });
  });
  refresh();
  return { ok: true, id };
}

/* ---------------- Admin: issue CAR ---------------- */

/** Issue (or update) the CAR: responsible person + due date. Allowed until verification. Admin only. */
export async function issueCar(id: string, input: { ownerId: string; dueDate: string }): Promise<NcResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const nc = db.nonconformities.find((n) => n.id === id);
  if (!nc) return fail("notFound");
  if (nc.status !== "open" && nc.status !== "in_progress") return fail("invalidState");

  const ownerId = clean(input.ownerId);
  const dueDate = clean(input.dueDate);
  const fieldErrors: Record<string, NcFieldError> = {};
  if (!getUserById(ownerId)) fieldErrors.ownerId = "required";
  if (!dueDate) fieldErrors.dueDate = "required";
  else if (!isValidDateOnly(dueDate)) fieldErrors.dueDate = "invalidDate";
  else if (dueDate < todayInBangkok()) fieldErrors.dueDate = "pastDate";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  await updateDb((db) => {
    const n = db.nonconformities.find((n) => n.id === id)!;
    const existing = n.car;
    n.car = existing
      ? { ...existing, ownerId, dueDate }
      : {
          number: nextNumber("CAR", db.nonconformities.filter((x) => x.car).map((x) => x.car!.number), todayInBangkok().slice(0, 4)),
          ownerId,
          dueDate,
          issuedAt: now(),
          issuedBy: user.id,
        };
    if (n.status === "open") {
      n.status = "in_progress";
    }
    n.events.push(event(user.id, existing ? "car_updated" : "car_issued"));
    db.auditLog.push(
      auditEntry(user, existing ? "update_car" : "issue_car", { type: "nc", id, label: `${n.number} / ${n.car.number}` }, {
        changes: diffFields(existing, n.car, ["ownerId", "dueDate"]),
      }),
    );
  });
  refresh();
  return { ok: true };
}

/* ---------------- Employee: plan & progress ---------------- */

/** Record root cause + corrective/preventive action. Employee of the department. */
export async function savePlan(
  id: string,
  input: { rootCause: string; correctiveAction: string; preventiveAction?: string },
): Promise<NcResult> {
  const db = await readDb();
  const nc = db.nonconformities.find((n) => n.id === id);
  if (!nc) return fail("notFound");
  const user = await requireDepartmentMember(nc);
  if ("ok" in user) return user;

  const rootCause = clean(input.rootCause);
  const correctiveAction = clean(input.correctiveAction);
  const preventiveAction = clean(input.preventiveAction);
  const fieldErrors: Record<string, NcFieldError> = {};
  if (!rootCause) fieldErrors.rootCause = "required";
  if (!correctiveAction) fieldErrors.correctiveAction = "required";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  await updateDb((db) => {
    const n = db.nonconformities.find((n) => n.id === id)!;
    const after = { rootCause, correctiveAction, preventiveAction, status: "in_progress" as const };
    const changes = diffFields(n, after, ["rootCause", "correctiveAction", "preventiveAction", "status"]);
    Object.assign(n, after);
    n.events.push(event(user.id, "plan_saved"));
    db.auditLog.push(auditEntry(user, "save_plan", { type: "nc", id, label: n.number }, { changes }));
  });
  refresh();
  return { ok: true };
}

/** Delete an NC (open state only). Admin / QE / ISO. */
export async function deleteNc(id: string): Promise<NcResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const existing = db.nonconformities.find((n) => n.id === id);
  if (!existing) return fail("notFound");
  if (existing.status !== "open") return fail("invalidState");

  await updateDb((draft) => {
    const idx = draft.nonconformities.findIndex((n) => n.id === id);
    if (idx === -1) return;
    const [removed] = draft.nonconformities.splice(idx, 1);
    draft.auditLog.push(auditEntry(user, "delete", { type: "nc", id: removed.id, label: removed.number }));
  });
  refresh();
  return { ok: true };
}

/** Add a progress update (0–100 % + note). Employee of the department. */
export async function addProgress(id: string, input: { percent: string; note: string }): Promise<NcResult> {
  const db = await readDb();
  const nc = db.nonconformities.find((n) => n.id === id);
  if (!nc) return fail("notFound");
  const user = await requireDepartmentMember(nc);
  if ("ok" in user) return user;

  const raw = clean(input.percent);
  const percent = Number(raw);
  const note = clean(input.note);
  const fieldErrors: Record<string, NcFieldError> = {};
  if (raw === "") fieldErrors.percent = "required";
  else if (!Number.isInteger(percent)) fieldErrors.percent = "invalidNumber";
  else if (percent < 0 || percent > 100) fieldErrors.percent = "outOfRange";
  if (!note) fieldErrors.note = "required";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  await updateDb((db) => {
    const n = db.nonconformities.find((n) => n.id === id)!;
    const changes = diffFields(n, { progress: percent, status: "in_progress" }, ["progress", "status"]);
    n.progress = percent;
    n.status = "in_progress";
    n.events.push(event(user.id, "progress", { percent, note }));
    db.auditLog.push(auditEntry(user, "progress", { type: "nc", id, label: n.number }, { changes, note }));
  });
  refresh();
  return { ok: true };
}

/** Record CAPA (root cause, corrective/preventive action) + result note and send for verification. Employee of the department. */
export async function submitForVerification(
  id: string,
  input?: { rootCause?: string; correctiveAction?: string; preventiveAction?: string; note?: string },
): Promise<NcResult> {
  const db = await readDb();
  const nc = db.nonconformities.find((n) => n.id === id);
  if (!nc) return fail("notFound");
  const user = await requireDepartmentMember(nc);
  if ("ok" in user) return user;

  const rootCause = input?.rootCause !== undefined ? clean(input.rootCause) : nc.rootCause;
  const correctiveAction = input?.correctiveAction !== undefined ? clean(input.correctiveAction) : nc.correctiveAction;
  const preventiveAction =
    input?.preventiveAction !== undefined ? clean(input.preventiveAction) : (nc.preventiveAction ?? "");
  const note = input ? clean(input.note) : "";

  const fieldErrors: Record<string, NcFieldError> = {};
  if (!rootCause) fieldErrors.rootCause = "required";
  if (!correctiveAction) fieldErrors.correctiveAction = "required";
  if (input && !note) fieldErrors.note = "required";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  await updateDb((db) => {
    const n = db.nonconformities.find((n) => n.id === id)!;
    const after = {
      rootCause,
      correctiveAction,
      preventiveAction,
      progress: 100,
      status: "pending_verification" as const,
    };
    const changes = diffFields(n, after, ["rootCause", "correctiveAction", "preventiveAction", "status"]);
    db.auditLog.push(
      auditEntry(user, "submit", { type: "nc", id, label: n.number }, {
        changes,
        note: note || undefined,
      }),
    );
    Object.assign(n, after);
    n.events.push(event(user.id, "submitted", note ? { note } : {}));
  });
  refresh();
  return { ok: true };
}

/* ---------------- Admin: verify & close ---------------- */

/**
 * Verify the correction. accepted → Closed; rejected → back to In Progress (note required).
 * Closing does NOT change any checklist result. Admin only.
 */
export async function verifyNc(
  id: string,
  input: { accepted?: boolean; note: string; measuredValue?: string },
): Promise<NcResult> {
  const user = await requireAdmin();
  if (!user) return fail("forbidden");
  const db = await readDb();
  const nc = db.nonconformities.find((n) => n.id === id);
  if (!nc) return fail("notFound");
  if (nc.status !== "pending_verification") return fail("invalidState");

  const sourceCl = nc.checklist ? db.checklists.find((c) => c.id === nc.checklist!.checklistId) : undefined;
  const isNumeric = sourceCl?.type === "numeric" && !!sourceCl.criteria;

  const fieldErrors: Record<string, NcFieldError> = {};
  const note = clean(input.note);
  if (!note) fieldErrors.note = "required";

  let numericVal: number | undefined;
  let accepted = input.accepted === true;

  if (isNumeric && sourceCl?.criteria) {
    const rawVal = clean(input.measuredValue);
    if (rawVal === "") {
      fieldErrors.measuredValue = "required";
    } else {
      const parsed = Number(rawVal);
      if (!Number.isFinite(parsed)) {
        fieldErrors.measuredValue = "invalidNumber";
      } else {
        numericVal = parsed;
        accepted = evaluateNumeric(sourceCl.criteria, parsed);
      }
    }
  } else if (input.accepted === undefined) {
    fieldErrors.result = "required";
  }

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  await updateDb((db) => {
    const n = db.nonconformities.find((n) => n.id === id)!;
    const verifiedAt = now();
    const cl = n.checklist ? db.checklists.find((c) => c.id === n.checklist!.checklistId) : undefined;
    const unit = cl?.criteria?.unit ? ` ${cl.criteria.unit}` : "";
    const noteWithVal = numericVal !== undefined ? `ค่าที่วัดได้ใหม่: ${numericVal}${unit} · ${note}` : note;

    db.auditLog.push(
      auditEntry(user, accepted ? "verify_pass" : "verify_fail", { type: "nc", id, label: n.number }, {
        changes: [{ field: "status", from: n.status, to: accepted ? "closed" : "in_progress" }],
        note: noteWithVal,
      }),
    );

    if (cl) {
      if (cl.type === "numeric" && numericVal !== undefined) {
        cl.results.unshift({
          id: randomUUID(),
          value: numericVal,
          passed: accepted,
          checkedAt: verifiedAt,
          checkedBy: user.id,
        });
      } else if (cl.type === "pass_fail") {
        cl.results.unshift({
          id: randomUUID(),
          value: accepted,
          passed: accepted,
          checkedAt: verifiedAt,
          checkedBy: user.id,
        });
      }
    }

    if (accepted) {
      n.status = "closed";
      n.verification = { at: verifiedAt, by: user.id, note: noteWithVal };
      n.events.push(event(user.id, "closed", { note: noteWithVal }));
    } else {
      n.status = "in_progress";
      n.events.push(event(user.id, "verify_rejected", { note: noteWithVal }));
    }
  });
  refresh();
  return { ok: true };
}
