"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import type { Role } from "@/config/access";
import { departments } from "@/data/departments";
import { auditEntry, diffFields } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { readDb, resetDb, updateDb } from "@/lib/db";
import type { FieldError } from "@/lib/standards/actions";

export type SettingsError = "forbidden" | "notFound" | "protectedDemoUser";
export type SettingsResult =
  | { ok: true; id?: string }
  | { ok: false; error?: SettingsError; fieldErrors?: Record<string, FieldError> };

const ROLES: Role[] = ["admin", "qe", "iso", "employee"];
const DEMO_USER_IDS = new Set(["u1", "u2", "u3", "u4"]);
const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

export type SaveUserInput = {
  name: string;
  nameEn: string;
  role: Role;
  position: string;
  departmentId: string;
  active: boolean;
};

export async function saveUser(id: string | null, input: SaveUserInput): Promise<SettingsResult> {
  const actor = await getSessionUser();
  if (!actor || (actor.role !== "admin" && actor.role !== "qe")) return { ok: false, error: "forbidden" };

  const dept = departments.find((d) => d.id === clean(input.departmentId));
  const data = {
    name: clean(input.name),
    nameEn: clean(input.nameEn) || clean(input.name),
    role: ROLES.includes(input.role) ? input.role : ("employee" as Role),
    position: clean(input.position),
    departmentId: dept?.id ?? "",
    department: dept?.nameEn ?? "",
    active: Boolean(input.active),
  };

  const fieldErrors: Record<string, FieldError> = {};
  if (!data.name) fieldErrors.name = "required";
  if (!data.position) fieldErrors.position = "required";
  if (!dept) fieldErrors.departmentId = "required";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const db = await readDb();
  if (id && !db.users.some((u) => u.id === id)) return { ok: false, error: "notFound" };

  const targetId = id ?? `u-${randomUUID().slice(0, 8)}`;

  await updateDb((draft) => {
    if (id) {
      const target = draft.users.find((u) => u.id === id);
      if (!target) return;
      const changes = diffFields(target, data, ["name", "role", "position", "departmentId", "active"]);
      Object.assign(target, data);
      if (changes.length) {
        draft.auditLog.push(
          auditEntry(actor, "update", { type: "user", id: target.id, label: target.name }, { changes }),
        );
      }
      return;
    }

    draft.users.push({ id: targetId, ...data });
    draft.auditLog.push(
      auditEntry(
        actor,
        "create",
        { type: "user", id: targetId, label: data.name },
        { changes: diffFields(undefined, data, ["name", "role", "position", "departmentId"]) },
      ),
    );
  });

  refresh();
  return { ok: true, id: targetId };
}

export async function deleteUser(id: string): Promise<SettingsResult> {
  const actor = await getSessionUser();
  if (!actor || (actor.role !== "admin" && actor.role !== "qe")) return { ok: false, error: "forbidden" };
  if (DEMO_USER_IDS.has(id) || actor.id === id) return { ok: false, error: "protectedDemoUser" };

  let deleted = false;
  await updateDb((draft) => {
    const idx = draft.users.findIndex((u) => u.id === id);
    if (idx === -1) return;
    const [removed] = draft.users.splice(idx, 1);
    deleted = true;
    draft.auditLog.push(
      auditEntry(actor, "delete", { type: "user", id: removed.id, label: removed.name }),
    );
  });
  if (!deleted) return { ok: false, error: "notFound" };

  refresh();
  return { ok: true };
}

export type SaveSettingsInput = {
  orgName: string;
  orgShortName: string;
  isoScope: string;
  riskAcceptableMaxScore: number;
  documentReviewCycleDays: number;
  ncDefaultDueDays: number;
};

export async function saveSystemSettings(input: SaveSettingsInput): Promise<SettingsResult> {
  const actor = await getSessionUser();
  if (!actor || (actor.role !== "admin" && actor.role !== "qe")) return { ok: false, error: "forbidden" };

  const data = {
    orgName: clean(input.orgName),
    orgShortName: clean(input.orgShortName),
    isoScope: clean(input.isoScope),
    riskAcceptableMaxScore: Math.min(24, Math.max(1, Math.round(Number(input.riskAcceptableMaxScore) || 9))),
    documentReviewCycleDays: Math.min(1825, Math.max(30, Math.round(Number(input.documentReviewCycleDays) || 365))),
    ncDefaultDueDays: Math.min(365, Math.max(1, Math.round(Number(input.ncDefaultDueDays) || 14))),
  };

  const fieldErrors: Record<string, FieldError> = {};
  if (!data.orgName) fieldErrors.orgName = "required";
  if (!data.orgShortName) fieldErrors.orgShortName = "required";
  if (!data.isoScope) fieldErrors.isoScope = "required";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const now = new Date().toISOString();
  await updateDb((draft) => {
    const changes = diffFields(draft.settings, data, [
      "orgName",
      "orgShortName",
      "isoScope",
      "riskAcceptableMaxScore",
      "documentReviewCycleDays",
      "ncDefaultDueDays",
    ]);
    draft.settings = { ...data, updatedAt: now, updatedBy: actor.id };
    if (changes.length) {
      draft.auditLog.push(
        auditEntry(actor, "update", { type: "settings", id: "system", label: data.orgShortName }, { changes }),
      );
    }
  });

  refresh();
  return { ok: true };
}

export async function resetDemoData(): Promise<SettingsResult> {
  const actor = await getSessionUser();
  if (!actor || (actor.role !== "admin" && actor.role !== "qe")) return { ok: false, error: "forbidden" };
  await resetDb();
  refresh();
  return { ok: true };
}
