import { connection } from "next/server";
import { getUserById, getUsers } from "@/data";
import { readDb } from "@/lib/db";
import { todayInBangkok } from "@/lib/nc";
import type { RequirementClauseOption } from "@/lib/standards/queries";
import { nextTrainingCode, trainingHealth } from "@/lib/training";
import type { TrainingHealth, TrainingRecord, User } from "@/lib/types";
import { displayName } from "@/lib/user";

export type TrainingView = TrainingRecord & {
  userName: string;
  standardLabel: string;
  health: TrainingHealth;
};

export type TrainingRequirementOption = RequirementClauseOption & {
  standardId: string;
};

export async function getTrainingList(user: User) {
  await connection();
  const db = await readDb();
  const today = todayInBangkok();
  const stdById = new Map(db.standards.map((s) => [s.id, `${s.code}:${s.version}`]));
  const canSeeAll = user.role === "admin" || user.role === "qe" || user.role === "iso";

  const visible = canSeeAll
    ? db.training
    : db.training.filter((tr) => tr.departmentId === user.departmentId || tr.userId === user.id);

  const records: TrainingView[] = visible
    .map((tr) => {
      const trainee = getUserById(tr.userId);
      return {
        ...tr,
        userName: trainee ? displayName(trainee, "th") : "-",
        standardLabel: tr.standardId ? (stdById.get(tr.standardId) ?? tr.standardId) : "-",
        health: trainingHealth(tr, today),
      };
    })
    .sort((a, b) => b.code.localeCompare(a.code));

  const requirements: TrainingRequirementOption[] = db.requirements.map((r) => ({
    id: r.id,
    standardId: r.standardId,
    number: r.number,
    name: r.name,
    departmentId: r.departmentId,
    checklistIds: r.checklistIds,
  }));

  return {
    records,
    standards: db.standards.map((s) => ({ id: s.id, label: `${s.code}:${s.version}` })),
    users: getUsers().map((u) => ({ id: u.id, name: displayName(u, "th"), departmentId: u.departmentId })),
    requirements,
    nextCode: nextTrainingCode(db.training.map((tr) => tr.code)),
  };
}
