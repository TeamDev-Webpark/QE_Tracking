"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { departments } from "@/data/departments";
import { getUserById } from "@/data";
import { auditEntry, diffFields } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { readDb, updateDb } from "@/lib/db";
import type { ActionResult, FieldError } from "@/lib/standards/actions";

export type RequirementInput = {
  standardId: string;
  number: string;
  name: string;
  description: string;
  departmentId: string;
  ownerId: string;
  checklistIds: string[];
};

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

/** Create (id undefined) or update a requirement. Admin only. */
export async function saveRequirement(id: string | undefined, input: RequirementInput): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };

  const db = await readDb();
  if (id && !db.requirements.some((r) => r.id === id)) return { ok: false, error: "notFound" };

  const data = {
    standardId: clean(input.standardId),
    number: clean(input.number),
    name: clean(input.name),
    description: clean(input.description),
    departmentId: clean(input.departmentId),
    ownerId: clean(input.ownerId),
    // Keep only unique checklists that belong to the selected standard.
    checklistIds: [...new Set(Array.isArray(input.checklistIds) ? input.checklistIds : [])].filter((cid) =>
      db.checklists.some((c) => c.id === cid && c.standardId === clean(input.standardId)),
    ),
  };

  const fieldErrors: Record<string, FieldError> = {};
  if (!db.standards.some((s) => s.id === data.standardId)) fieldErrors.standardId = "required";
  if (!data.number) fieldErrors.number = "required";
  if (!data.name) fieldErrors.name = "required";
  if (!departments.some((d) => d.id === data.departmentId)) fieldErrors.departmentId = "required";
  if (!getUserById(data.ownerId)) fieldErrors.ownerId = "required";
  const duplicate = db.requirements.some(
    (r) =>
      r.id !== id &&
      r.standardId === data.standardId &&
      r.departmentId === data.departmentId &&
      r.number.toLowerCase() === data.number.toLowerCase(),
  );
  if (data.number && !fieldErrors.standardId && !fieldErrors.departmentId && duplicate) {
    fieldErrors.number = "duplicate";
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  await updateDb((db) => {
    const fields = ["standardId", "number", "name", "description", "departmentId", "ownerId", "checklistIds"] as const;
    const entity = { type: "requirement" as const, label: `${data.number} ${data.name}` };
    if (id) {
      const r = db.requirements.find((r) => r.id === id)!;
      const oldNumber = r.number;
      const changes = diffFields(r, data, [...fields]);
      Object.assign(r, data);
      if (oldNumber !== data.number) {
        for (const c of db.checklists) {
          if (c.standardId === data.standardId && data.checklistIds.includes(c.id) && c.clause === oldNumber) {
            c.clause = data.number;
          }
        }
      }
      db.auditLog.push(auditEntry(user, "update", { ...entity, id }, { changes }));
    } else {
      const newId = randomUUID();
      db.requirements.push({ id: newId, ...data });
      db.auditLog.push(auditEntry(user, "create", { ...entity, id: newId }, { changes: diffFields(undefined, data, [...fields]) }));
    }
  });
  refresh();
  return { ok: true };
}

/** Delete a requirement. Admin / QE only. */
export async function deleteRequirement(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };

  const db = await readDb();
  const target = db.requirements.find((r) => r.id === id);
  if (!target) return { ok: false, error: "notFound" };

  await updateDb((db) => {
    db.auditLog.push(
      auditEntry(user, "delete", { type: "requirement", id, label: `${target.number} ${target.name}` }, {
        note: `linkedChecklists: ${target.checklistIds.length}`,
      }),
    );
    db.requirements = db.requirements.filter((r) => r.id !== id);
  });
  refresh();
  return { ok: true };
}
