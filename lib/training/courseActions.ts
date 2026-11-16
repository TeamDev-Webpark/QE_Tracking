"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { auditEntry, diffFields } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { readDb, updateDb } from "@/lib/db";
import type { FieldError } from "@/lib/standards/actions";

export type CourseFieldError = FieldError | "invalidNumber";
export type CourseError = "forbidden" | "notFound";
export type CourseActionResult =
  | { ok: true; id?: string }
  | { ok: false; error?: CourseError; fieldErrors?: Record<string, CourseFieldError> };

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

export type SaveTrainingCourseInput = {
  code: string;
  name: string;
  description: string;
  standardId: string;
  durationHours: string;
  validityMonths: string;
  active: boolean;
};

export async function saveTrainingCourse(
  id: string | null,
  input: SaveTrainingCourseInput,
): Promise<CourseActionResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };

  const db = await readDb();
  const existing = id ? db.trainingCourses.find((c) => c.id === id) : undefined;
  if (id && !existing) return { ok: false, error: "notFound" };

  const code = clean(input.code);
  const name = clean(input.name);
  const rawHours = clean(input.durationHours);
  const rawMonths = clean(input.validityMonths);
  const durationHours = rawHours === "" ? undefined : Number(rawHours);
  const validityMonths = rawMonths === "" ? undefined : Number(rawMonths);

  const fieldErrors: Record<string, CourseFieldError> = {};
  if (!code) fieldErrors.code = "required";
  if (!name) fieldErrors.name = "required";
  if (rawHours !== "" && (Number.isNaN(durationHours) || (durationHours as number) <= 0)) {
    fieldErrors.durationHours = "invalidNumber";
  }
  if (rawMonths !== "" && (Number.isNaN(validityMonths) || (validityMonths as number) <= 0)) {
    fieldErrors.validityMonths = "invalidNumber";
  }
  if (code && db.trainingCourses.some((c) => c.id !== id && c.code.toLowerCase() === code.toLowerCase())) {
    fieldErrors.code = "duplicate";
  }
  if (name && db.trainingCourses.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
    fieldErrors.name = "duplicate";
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const data = {
    code,
    name,
    description: clean(input.description) || undefined,
    standardId: clean(input.standardId) || undefined,
    durationHours,
    validityMonths,
    active: Boolean(input.active),
  };

  const targetId = id ?? randomUUID();
  const now = new Date().toISOString();

  await updateDb((draft) => {
    if (id) {
      const target = draft.trainingCourses.find((c) => c.id === id);
      if (!target) return;
      const prevName = target.name;
      const changes = diffFields(target, data, [
        "code",
        "name",
        "standardId",
        "durationHours",
        "validityMonths",
        "active",
      ]);
      Object.assign(target, data, { updatedAt: now, updatedBy: user.id });
      // Keep linked training records in sync if course name changed.
      if (prevName !== data.name) {
        for (const tr of draft.training) {
          if (tr.course === prevName) tr.course = data.name;
        }
      }
      if (changes.length) {
        draft.auditLog.push(
          auditEntry(user, "update", { type: "training", id: target.id, label: `${target.code} ${target.name}` }, { changes }),
        );
      }
      return;
    }

    draft.trainingCourses.push({
      id: targetId,
      ...data,
      updatedAt: now,
      updatedBy: user.id,
    });
    draft.auditLog.push(
      auditEntry(
        user,
        "create",
        { type: "training", id: targetId, label: `${data.code} ${data.name}` },
        { changes: diffFields(undefined, data, ["code", "name", "active"]) },
      ),
    );
  });

  refresh();
  return { ok: true, id: targetId };
}

export async function deleteTrainingCourse(id: string): Promise<CourseActionResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };

  const db = await readDb();
  const target = db.trainingCourses.find((c) => c.id === id);
  if (!target) return { ok: false, error: "notFound" };

  await updateDb((draft) => {
    draft.trainingCourses = draft.trainingCourses.filter((c) => c.id !== id);
    draft.auditLog.push(
      auditEntry(user, "delete", { type: "training", id: target.id, label: `${target.code} ${target.name}` }),
    );
  });

  refresh();
  return { ok: true };
}
