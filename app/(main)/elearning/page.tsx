import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ElearningView, type ElearningCourseItem } from "@/components/training/ElearningView";
import { PageSkeleton } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { readDb } from "@/lib/db";

export const metadata: Metadata = { title: "E-Learning" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ElearningData />
    </Suspense>
  );
}

async function ElearningData() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = await readDb();
  const stdById = new Map(db.standards.map((s) => [s.id, `${s.code}:${s.version}`]));

  const courses: ElearningCourseItem[] = db.trainingCourses
    .filter((c) => c.active)
    .map((c) => {
      const myRecord = db.training.find((tr) => tr.userId === user.id && tr.course === c.name);
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        standardLabel: c.standardId ? (stdById.get(c.standardId) ?? c.standardId) : "ISO 9001:2015",
        durationHours: c.durationHours,
        validityMonths: c.validityMonths,
        curriculum: c.curriculum,
        myRecord: myRecord
          ? {
              code: myRecord.code,
              status: myRecord.status,
              completedDate: myRecord.completedDate,
              expiryDate: myRecord.expiryDate,
              score: myRecord.score,
              passed: myRecord.passed,
            }
          : undefined,
      };
    });

  return (
    <ElearningView
      courses={courses}
      learner={{
        name: user.name,
        position: user.position,
      }}
    />
  );
}
