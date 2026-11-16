import { connection } from "next/server";
import { readDb } from "@/lib/db";
import type { TrainingCourse } from "@/lib/types";

export type TrainingCourseView = TrainingCourse & {
  standardLabel: string;
  attendeeCount: number;
  completedCount: number;
};

function nextCourseCode(existingCodes: string[]): string {
  const max = existingCodes.reduce((m, c) => {
    const match = /^CRS-(\d+)$/i.exec(c);
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
  return `CRS-${String(max + 1).padStart(2, "0")}`;
}

export async function getTrainingCourses() {
  await connection();
  const db = await readDb();
  const stdById = new Map(db.standards.map((s) => [s.id, `${s.code}:${s.version}`]));

  const courses: TrainingCourseView[] = db.trainingCourses
    .map((c) => {
      const matched = db.training.filter((tr) => tr.course === c.name);
      return {
        ...c,
        standardLabel: c.standardId ? (stdById.get(c.standardId) ?? c.standardId) : "-",
        attendeeCount: matched.length,
        completedCount: matched.filter((tr) => tr.status === "completed").length,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  return {
    courses,
    standards: db.standards.map((s) => ({ id: s.id, label: `${s.code}:${s.version}` })),
    nextCode: nextCourseCode(db.trainingCourses.map((c) => c.code)),
  };
}
