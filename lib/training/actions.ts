"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { getUserById } from "@/data";
import { departments } from "@/data/departments";
import { auditEntry, diffFields } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { readDb, updateDb } from "@/lib/db";
import type { FieldError } from "@/lib/standards/actions";
import { nextTrainingCode } from "@/lib/training";
import type { TrainingStatus } from "@/lib/types";

export type TrainingFieldError = FieldError | "invalidNumber" | "outOfRange";
export type TrainingError = "forbidden" | "notFound";
export type TrainingResult =
  | { ok: true; id?: string }
  | { ok: false; error?: TrainingError; fieldErrors?: Record<string, TrainingFieldError> };

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");
const isValidYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export type SaveTrainingInput = {
  code?: string;
  title: string;
  userId: string;
  departmentId: string;
  standardId: string;
  clause: string;
  trainer: string;
  status: TrainingStatus;
  completedDate: string;
  expiryDate: string;
  score: string;
  passed: boolean;
  note: string;
};

export async function saveTraining(id: string | null, input: SaveTrainingInput): Promise<TrainingResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };

  const db = await readDb();
  const existing = id ? db.training.find((tr) => tr.id === id) : undefined;
  if (id && !existing) return { ok: false, error: "notFound" };

  const rawCode = clean(input.code);
  const code = rawCode || existing?.code || nextTrainingCode(db.training.map((tr) => tr.code));
  const status: TrainingStatus = input.status === "completed" ? "completed" : "planned";
  const completedDate = clean(input.completedDate);
  const expiryDate = clean(input.expiryDate);
  const rawScore = clean(input.score);
  const score = rawScore === "" ? undefined : Number(rawScore);

  const data = {
    code,
    title: clean(input.title),
    userId: clean(input.userId),
    departmentId: clean(input.departmentId),
    standardId: clean(input.standardId),
    clause: clean(input.clause),
    trainer: clean(input.trainer),
    status,
    completedDate: status === "completed" && completedDate ? completedDate : undefined,
    expiryDate: status === "completed" && expiryDate ? expiryDate : undefined,
    score: status === "completed" ? score : undefined,
    passed: status === "completed" ? Boolean(input.passed) : undefined,
    note: clean(input.note) || undefined,
  };

  const fieldErrors: Record<string, TrainingFieldError> = {};
  if (!data.title) fieldErrors.title = "required";
  if (!getUserById(data.userId)) fieldErrors.userId = "required";
  if (!departments.some((d) => d.id === data.departmentId)) fieldErrors.departmentId = "required";
  if (!data.trainer) fieldErrors.trainer = "required";
  if (status === "completed" && !isValidYmd(completedDate)) fieldErrors.completedDate = "required";
  if (expiryDate && !isValidYmd(expiryDate)) fieldErrors.expiryDate = "required";
  if (rawScore !== "" && (Number.isNaN(score) || (score as number) < 0 || (score as number) > 100)) {
    fieldErrors.score = "outOfRange";
  }
  if (db.training.some((tr) => tr.id !== id && tr.code.toLowerCase() === data.code.toLowerCase())) {
    fieldErrors.code = "duplicate";
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const targetId = id ?? randomUUID();
  const now = new Date().toISOString();

  await updateDb((draft) => {
    if (id) {
      const target = draft.training.find((tr) => tr.id === id);
      if (!target) return;
      const changes = diffFields(target, data, [
        "code",
        "title",
        "userId",
        "departmentId",
        "trainer",
        "status",
        "completedDate",
        "expiryDate",
        "score",
        "passed",
      ]);
      Object.assign(target, data, { updatedAt: now, updatedBy: user.id });
      if (changes.length) {
        draft.auditLog.push(
          auditEntry(user, "update", { type: "training", id: target.id, label: target.code }, { changes }),
        );
      }
      return;
    }

    draft.training.push({
      id: targetId,
      ...data,
      updatedAt: now,
      updatedBy: user.id,
    });
    draft.auditLog.push(
      auditEntry(
        user,
        "create",
        { type: "training", id: targetId, label: data.code },
        { changes: diffFields(undefined, data, ["code", "title", "userId", "departmentId", "status"]) },
      ),
    );
  });

  refresh();
  return { ok: true, id: targetId };
}

export async function deleteTraining(id: string): Promise<TrainingResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };

  let deleted = false;
  await updateDb((draft) => {
    const idx = draft.training.findIndex((tr) => tr.id === id);
    if (idx === -1) return;
    const [removed] = draft.training.splice(idx, 1);
    deleted = true;
    draft.auditLog.push(auditEntry(user, "delete", { type: "training", id: removed.id, label: removed.code }));
  });
  if (!deleted) return { ok: false, error: "notFound" };

  refresh();
  return { ok: true };
}
