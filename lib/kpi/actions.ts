"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { departments } from "@/data/departments";
import { auditEntry, diffFields } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { readDb, updateDb } from "@/lib/db";
import type { KpiDirection } from "@/lib/types";

export type KpiFieldError = "required" | "invalidNumber" | "invalidDate";
export type KpiResultMsg =
  | { ok: true }
  | { ok: false; error?: "forbidden" | "notFound"; fieldErrors?: Record<string, KpiFieldError> };

export type KpiInput = {
  name: string;
  description: string;
  departmentId: string;
  standardId: string; // "" = none
  unit: string;
  direction: KpiDirection;
  target: string;
  actual: string; // "" = not measured yet
  period: string; // YYYY-MM
};

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

/** "" → null, number → number, otherwise NaN. */
const parseNumber = (s: string) => (s === "" ? null : Number.isFinite(Number(s)) ? Number(s) : NaN);

/** Create (id undefined) or update a KPI, including Target and Actual. Admin only. */
export async function saveKpi(id: string | undefined, input: KpiInput): Promise<KpiResultMsg> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };
  const db = await readDb();
  if (id && !db.kpis.some((k) => k.id === id)) return { ok: false, error: "notFound" };

  const target = parseNumber(clean(input.target));
  const actual = parseNumber(clean(input.actual));
  const data = {
    name: clean(input.name),
    description: clean(input.description),
    departmentId: clean(input.departmentId),
    standardId: clean(input.standardId),
    unit: clean(input.unit),
    direction: (input.direction === "lower" ? "lower" : "higher") as KpiDirection,
    period: clean(input.period),
  };

  const fieldErrors: Record<string, KpiFieldError> = {};
  if (!data.name) fieldErrors.name = "required";
  if (!departments.some((d) => d.id === data.departmentId)) fieldErrors.departmentId = "required";
  if (data.standardId && !db.standards.some((s) => s.id === data.standardId)) fieldErrors.standardId = "required";
  if (target === null) fieldErrors.target = "required";
  else if (Number.isNaN(target)) fieldErrors.target = "invalidNumber";
  if (actual !== null && Number.isNaN(actual)) fieldErrors.actual = "invalidNumber";
  if (!data.period) fieldErrors.period = "required";
  else if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.period)) fieldErrors.period = "invalidDate";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const now = new Date().toISOString();
  const record = { ...data, target: target as number, actual, updatedAt: now, updatedBy: user.id };
  const fields = ["name", "description", "departmentId", "standardId", "unit", "direction", "target", "actual", "period"] as const;

  await updateDb((db) => {
    if (id) {
      const k = db.kpis.find((k) => k.id === id)!;
      const changes = diffFields(k, record, [...fields]);
      Object.assign(k, record);
      db.auditLog.push(auditEntry(user, "update", { type: "kpi", id, label: record.name }, { changes }));
    } else {
      const newId = randomUUID();
      db.kpis.push({ id: newId, ...record });
      db.auditLog.push(
        auditEntry(user, "create", { type: "kpi", id: newId, label: record.name }, {
          changes: diffFields(undefined, record, [...fields]),
        }),
      );
    }
  });
  refresh();
  return { ok: true };
}

/** Delete a KPI. Admin / QE only. */
export async function deleteKpi(id: string): Promise<KpiResultMsg> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };

  let deleted = false;
  await updateDb((draft) => {
    const idx = draft.kpis.findIndex((k) => k.id === id);
    if (idx === -1) return;
    const [removed] = draft.kpis.splice(idx, 1);
    deleted = true;
    draft.auditLog.push(auditEntry(user, "delete", { type: "kpi", id: removed.id, label: removed.name }));
  });
  if (!deleted) return { ok: false, error: "notFound" };

  refresh();
  return { ok: true };
}
