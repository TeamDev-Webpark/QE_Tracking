"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import type { CourseCurriculum } from "@/data/elearningCurriculum";
import { auditEntry } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { readDb, updateDb } from "@/lib/db";
import { todayInBangkok } from "@/lib/nc";
import { nextTrainingCode } from "@/lib/training";

function addMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

/** Save E-Learning quiz result directly into the user's Training records. */
export async function submitElearningResult(input: {
  courseId: string;
  score: number;
}): Promise<{ ok: boolean; error?: "forbidden" | "notFound" }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "forbidden" };

  const db = await readDb();
  const course = db.trainingCourses.find((c) => c.id === input.courseId && c.active);
  if (!course) return { ok: false, error: "notFound" };

  const score = Math.max(0, Math.min(100, Math.round(input.score)));
  const passed = score >= 80;
  const today = todayInBangkok();
  const expiryDate = course.validityMonths ? addMonths(today, course.validityMonths) : undefined;
  const now = new Date().toISOString();

  await updateDb((draft) => {
    const existing = draft.training.find(
      (tr) => tr.userId === user.id && tr.course === course.name,
    );
    const clause = course.name === "Document Control" ? "7.5.3" : "7.2";

    if (existing) {
      existing.status = "completed";
      existing.completedDate = today;
      existing.expiryDate = expiryDate;
      existing.score = score;
      existing.passed = passed;
      existing.trainer = "ระบบ E-Learning ออนไลน์";
      existing.note = `ทำแบบทดสอบผ่าน E-Learning (${score}/100 คะแนน)`;
      existing.updatedAt = now;
      existing.updatedBy = user.id;
      draft.auditLog.push(
        auditEntry(
          user,
          "update",
          { type: "training", id: existing.id, label: existing.code },
          { note: `E-Learning: ${course.name} (${score}/100)` },
        ),
      );
      return;
    }

    const id = randomUUID();
    const code = nextTrainingCode(draft.training.map((tr) => tr.code));
    draft.training.push({
      id,
      code,
      course: course.name,
      title: `อบรมออนไลน์: ${course.name}`,
      userId: user.id,
      departmentId: user.departmentId,
      standardId: course.standardId ?? "iso9001",
      clause,
      trainer: "ระบบ E-Learning ออนไลน์",
      status: "completed",
      completedDate: today,
      expiryDate,
      score,
      passed,
      note: `ทำแบบทดสอบผ่าน E-Learning (${score}/100 คะแนน)`,
      updatedAt: now,
      updatedBy: user.id,
    });
    draft.auditLog.push(
      auditEntry(
        user,
        "create",
        { type: "training", id, label: code },
        { note: `E-Learning: ${course.name} (${score}/100)` },
      ),
    );
  });

  refresh();
  return { ok: true };
}

/** Save custom E-Learning chapters and exam questions for a course (Admin / QE only). */
export async function saveCourseCurriculum(
  courseId: string,
  curriculum: CourseCurriculum,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) {
    return { ok: false, error: "เฉพาะผู้ดูแลระบบ (Admin) หรือ QE เท่านั้นที่แก้ไขเนื้อหาหลักสูตรได้" };
  }

  if (!curriculum.chapters || curriculum.chapters.length === 0) {
    return { ok: false, error: "ต้องมีบทเรียนอย่างน้อย 1 บท" };
  }
  if (!curriculum.questions || curriculum.questions.length === 0) {
    return { ok: false, error: "ต้องมีข้อสอบวัดผลอย่างน้อย 1 ข้อ" };
  }

  const db = await readDb();
  const existing = db.trainingCourses.find((c) => c.id === courseId);
  if (!existing) return { ok: false, error: "ไม่พบหลักสูตรที่ระบุ" };

  const now = new Date().toISOString();

  await updateDb((draft) => {
    const target = draft.trainingCourses.find((c) => c.id === courseId);
    if (!target) return;
    target.curriculum = curriculum;
    target.updatedAt = now;
    target.updatedBy = user.id;
    draft.auditLog.push(
      auditEntry(
        user,
        "update",
        { type: "training", id: target.id, label: `${target.code} ${target.name}` },
        {
          note: `อัปเดตเนื้อหา E-Learning (${curriculum.chapters.length} บทเรียน, ข้อสอบ ${curriculum.questions.length} ข้อ)`,
        },
      ),
    );
  });

  refresh();
  return { ok: true };
}
