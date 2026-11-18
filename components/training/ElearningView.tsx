"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Button, Card, PageHeader, useToast } from "@/components/ui";
import { StatTile } from "@/components/dashboard/StatTile";
import { useI18n } from "@/components/providers/I18nProvider";
import { departmentName, formatDate } from "@/lib/format";
import { useSessionUser } from "@/components/providers/SessionProvider";
import {
  getCourseCurriculum,
  type CourseCurriculum,
  type LessonChapter,
} from "@/data/elearningCurriculum";
import { submitElearningResult } from "@/lib/training/elearningActions";
import { ElearningEditorModal } from "./ElearningEditorModal";
import { LessonVideoPlayer, type ChapterQuizCompletionResult } from "./LessonVideoPlayer";

export type ElearningCourseItem = {
  id: string;
  code: string;
  name: string;
  description?: string;
  standardLabel: string;
  durationHours?: number;
  validityMonths?: number;
  curriculum?: CourseCurriculum;
  myRecord?: {
    code: string;
    status: "planned" | "completed";
    completedDate?: string;
    expiryDate?: string;
    score?: number;
    passed?: boolean;
  };
};

type Stage = { type: "chapter"; index: number } | { type: "exam" } | { type: "certificate" };

export function ElearningView({
  courses,
  learner,
}: {
  courses: ElearningCourseItem[];
  learner: { name: string; position: string };
}) {
  const { t, lang } = useI18n();
  const user = useSessionUser();
  const canManage = user.role === "admin" || user.role === "qe";
  const toast = useToast();

  const [prevCourses, setPrevCourses] = useState(courses);
  const [courseList, setCourseList] = useState(courses);

  if (courses !== prevCourses) {
    setPrevCourses(courses);
    setCourseList(courses);
  }

  const [activeCourse, setActiveCourse] = useState<ElearningCourseItem | null>(null);
  const [editingCourse, setEditingCourse] = useState<ElearningCourseItem | null>(null);
  const [stage, setStage] = useState<Stage>({ type: "chapter", index: 0 });
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [checkedTakeaway, setCheckedTakeaway] = useState<Record<string, boolean>>({});
  const [chapterQuizResults, setChapterQuizResults] = useState<
    Record<string, ChapterQuizCompletionResult>
  >({});
  const [chapterRetakeCounter, setChapterRetakeCounter] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [examResult, setExamResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const handleCurriculumSaved = (updatedCurriculum: CourseCurriculum) => {
    if (!editingCourse) return;
    const targetId = editingCourse.id;
    setCourseList((prev) =>
      prev.map((c) => (c.id === targetId ? { ...c, curriculum: updatedCurriculum } : c)),
    );
    setActiveCourse((prev) => {
      if (prev?.id === targetId) {
        return { ...prev, curriculum: updatedCurriculum };
      }
      return prev;
    });
  };

  const passedCount = courseList.filter((c) => c.myRecord?.status === "completed" && c.myRecord.passed).length;
  const remainingCount = courseList.length - passedCount;

  const resolveCurriculum = (course: ElearningCourseItem) =>
    course.curriculum ?? getCourseCurriculum(course.name, course.description);

  const enterClassroom = (course: ElearningCourseItem, mode: "learn" | "certificate" = "learn") => {
    const curriculum = resolveCurriculum(course);
    const alreadyPassed = course.myRecord?.status === "completed" && course.myRecord.passed;
    setActiveCourse(course);
    if (mode === "certificate" && alreadyPassed) {
      setCompletedChapters(new Set(curriculum.chapters.map((ch) => ch.id)));
      setCheckedTakeaway(Object.fromEntries(curriculum.chapters.map((ch) => [ch.id, true])));
      setExamResult({ score: course.myRecord?.score ?? 100, passed: true });
      setStage({ type: "certificate" });
    } else {
      setCompletedChapters(new Set());
      setCheckedTakeaway({});
      setChapterQuizResults({});
      setChapterRetakeCounter({});
      setExamResult(null);
      setStage({ type: "chapter", index: 0 });
    }
    setAnswers({});
  };

  if (activeCourse) {
    const liveCourse = courseList.find((c) => c.id === activeCourse.id) ?? activeCourse;
    const curriculum = resolveCurriculum(liveCourse);
    const totalChapters = curriculum.chapters.length;
    const doneChapters = curriculum.chapters.filter((ch) => completedChapters.has(ch.id)).length;
    const allChaptersDone = doneChapters === totalChapters;
    const progressPct = Math.round(
      ((doneChapters + (examResult?.passed ? 1 : 0)) / (totalChapters + 1)) * 100,
    );

    // Aggregate in-video checkpoint quiz answers from all chapters in this course (computed inline without conditional hook)
    const courseCheckpointSummary = (() => {
      let totalCourseCheckpoints = 0;
      let totalCorrectCheckpoints = 0;
      const chapterBreakdown: Array<{
        chapterId: string;
        chapterTitle: string;
        total: number;
        correct: number;
        passed: boolean;
      }> = [];

      for (const ch of curriculum.chapters) {
        const res = chapterQuizResults[ch.id];
        const chTotal = ch.videoCheckpoints && ch.videoCheckpoints.length > 0 ? ch.videoCheckpoints.length : 1;
        totalCourseCheckpoints += chTotal;
        const chCorrect = res ? res.correctCount : 0;
        totalCorrectCheckpoints += chCorrect;
        chapterBreakdown.push({
          chapterId: ch.id,
          chapterTitle: ch.title,
          total: chTotal,
          correct: chCorrect,
          passed: res ? res.correctCount === chTotal : false,
        });
      }

      const scorePct =
        totalCourseCheckpoints > 0
          ? Math.round((totalCorrectCheckpoints / totalCourseCheckpoints) * 100)
          : 100;
      const isPassed = totalCourseCheckpoints === 0 || scorePct >= 80;

      return {
        totalCourseCheckpoints,
        totalCorrectCheckpoints,
        scorePct,
        isPassed,
        chapterBreakdown,
      };
    })();

    const handleRetakeCourse = () => {
      setCompletedChapters(new Set());
      setChapterQuizResults({});
      setCheckedTakeaway({});
      setChapterRetakeCounter((prev) => {
        const next = { ...prev };
        curriculum.chapters.forEach((ch) => {
          next[ch.id] = (next[ch.id] || 0) + 1;
        });
        return next;
      });
      setAnswers({});
      setExamResult(null);
      setStage({ type: "chapter", index: 0 });
      toast.info("ระบบรีเซ็ตบทเรียนและคำถามทั้งหมดแล้ว กรุณาเริ่มเรียนและตอบคำถามใหม่ตั้งแต่บทที่ 1");
    };

    const markChapterComplete = (chapter: LessonChapter, idx: number) => {
      if (!checkedTakeaway[chapter.id]) {
        toast.error("กรุณาติ๊กยืนยันความเข้าใจเนื้อหาท้ายบทเรียนก่อนไปบทถัดไป");
        return;
      }
      const nextSet = new Set(completedChapters);
      nextSet.add(chapter.id);
      setCompletedChapters(nextSet);

      if (idx + 1 < totalChapters) {
        setStage({ type: "chapter", index: idx + 1 });
      } else {
        setStage({ type: "exam" });
      }
    };

    const handleSubmitExam = () => {
      if (!courseCheckpointSummary.isPassed) {
        toast.error(
          "ไม่สามารถส่งข้อสอบได้: ผลการประเมินคำถามระหว่างบทเรียนไม่ผ่านเกณฑ์ กรุณากด 'เริ่มเรียนใหม่และสอบแก้ตัวทุกบทเรียน' ด้านบน",
        );
        return;
      }
      if (Object.keys(answers).length < curriculum.questions.length) {
        toast.error(`กรุณาตอบคำถามให้ครบทั้ง ${curriculum.questions.length} ข้อก่อนส่งกระดาษคำตอบ`);
        return;
      }
      let correct = 0;
      curriculum.questions.forEach((q, idx) => {
        if (answers[idx] === q.answerIndex) correct++;
      });
      const score = Math.round((correct / curriculum.questions.length) * 100);
      const passed = score >= 80;

      startTransition(async () => {
        const res = await submitElearningResult({ courseId: activeCourse.id, score });
        if (!res.ok) {
          toast.error("ไม่สามารถบันทึกผลการสอบได้");
          return;
        }
        setExamResult({ score, passed });
        if (passed) {
          toast.success(`สอบผ่าน! ได้คะแนน ${score}/100 (บันทึกเข้าทะเบียนประวัติการอบรมแล้ว)`);
        } else {
          toast.error(`ได้คะแนน ${score}/100 (เกณฑ์ผ่าน 80%) กรุณาทบทวนคำอธิบายและทำแบบทดสอบใหม่`);
        }
      });
    };

    return (
      <div className="space-y-5">
        {/* Top Classroom Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCourse(null)}
                className="rounded-lg border border-border bg-page px-2.5 py-1 text-xs font-semibold text-text hover:bg-primary-soft hover:text-primary transition-colors cursor-pointer"
              >
                ← ออกจากห้องเรียน
              </button>
              <span className="font-mono text-xs font-bold text-primary">{activeCourse.code}</span>
              <Badge tone="purple">{activeCourse.standardLabel}</Badge>
              {examResult?.passed && <Badge tone="success">ผ่านการอบรมแล้ว ({examResult.score}%)</Badge>}
              {canManage && (
                <button
                  type="button"
                  onClick={() => setEditingCourse(liveCourse)}
                  className="rounded-lg border border-primary/30 bg-primary-soft/60 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                >
                  ⚙️ จัดการบทเรียน & ข้อสอบ
                </button>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-text">{activeCourse.name}</h1>
            <p className="text-xs text-text-muted">
              ผู้สอน: <strong className="text-text">{curriculum.instructor}</strong> · ผู้เรียน:{" "}
              <strong className="text-text">{learner.name}</strong> ({learner.position})
            </p>
          </div>

          <div className="w-full sm:w-56 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-muted">ความคืบหน้าการเรียน</span>
              <span className="font-bold text-primary tabular-nums">{progressPct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-page border border-border/60">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-text-muted">
              เรียนจบ {doneChapters}/{totalChapters} บทเรียน{" "}
              {examResult?.passed ? "· สอบผ่านแล้ว" : "· รอสอบปลายภาค"}
            </p>
          </div>
        </div>

        {/* Main Split Classroom Layout */}
        <div className="grid gap-5 lg:grid-cols-12 items-start">
          {/* Left Curriculum Outline */}
          <Card className="lg:col-span-4 space-y-4 p-4 sm:p-5">
            <div className="space-y-2 border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-text">โครงสร้างหลักสูตร</h2>
                <span className="rounded-full bg-page px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
                  {doneChapters}/{totalChapters} บทเรียน
                </span>
              </div>
              <p className="rounded-lg bg-page px-2.5 py-2 text-[11px] leading-relaxed text-text-muted">
                💡 <strong className="text-text">ทำไมถึงกดข้ามบทไม่ได้:</strong> ระบบกำหนดให้ต้องศึกษาเนื้อหาและติ๊ก{" "}
                <strong className="text-primary">✓ ยืนยันความเข้าใจ</strong> ท้ายบทเรียน แล้วกดปุ่ม{" "}
                <strong className="text-primary">บันทึกเรียนจบบทนี้</strong> ทีละบทตามลำดับ
              </p>
            </div>

            <div className="space-y-1.5">
              {curriculum.chapters.map((ch, idx) => {
                const isDone = completedChapters.has(ch.id);
                const isUnlocked = idx === 0 || completedChapters.has(curriculum.chapters[idx - 1].id);
                const isCurrent = stage.type === "chapter" && stage.index === idx;
                const cleanTitle = ch.title.replace(/^บทที่\s*\d+\s*:\s*/, "");
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      if (!isUnlocked) {
                        toast.error(
                          `ยังไม่สามารถเข้าเรียนบทที่ ${idx + 1} ได้: กรุณาเรียนบทที่ ${idx} ให้จบ (ติ๊กยืนยันความเข้าใจท้ายบท แล้วกดปุ่ม "บันทึกเรียนจบบทนี้") ก่อน`,
                        );
                        return;
                      }
                      setStage({ type: "chapter", index: idx });
                    }}
                    className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      !isUnlocked
                        ? "opacity-60 cursor-not-allowed bg-page/40"
                        : isCurrent
                          ? "bg-primary-soft/80 text-primary cursor-pointer"
                          : "hover:bg-page text-text cursor-pointer"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        isDone
                          ? "bg-success text-white"
                          : isCurrent
                            ? "bg-primary text-white"
                            : !isUnlocked
                              ? "bg-page border border-border text-text-muted"
                              : "bg-page border border-border text-text-muted group-hover:border-primary/40"
                      }`}
                    >
                      {isDone ? "✓" : !isUnlocked ? "🔒" : idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold leading-snug ${isCurrent ? "text-primary" : "text-text"}`}>
                        {cleanTitle}
                      </p>
                      <p className={`mt-0.5 text-[11px] ${!isUnlocked ? "font-medium text-danger/80" : "text-text-muted"}`}>
                        {!isUnlocked
                          ? `กดไม่ได้ — ต้องเรียนและกดบันทึกจบบทที่ ${idx} ก่อน`
                          : isDone
                            ? `เรียนจบบทนี้แล้ว · ${ch.clauseRef}`
                            : `${ch.clauseRef} · ${ch.durationMin} นาที`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-border/60 pt-3 space-y-1.5">
              {/* Final Assessment Step */}
              <button
                type="button"
                onClick={() => {
                  if (!allChaptersDone) {
                    toast.error(
                      `ยังไม่สามารถเข้าสอบได้: ต้องเรียนให้จบครบทั้ง ${totalChapters} บทก่อน (ปัจจุบันเรียนจบ ${doneChapters}/${totalChapters} บท)`,
                    );
                    return;
                  }
                  setStage({ type: "exam" });
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  !allChaptersDone
                    ? "opacity-60 cursor-not-allowed bg-page/40"
                    : stage.type === "exam"
                      ? "bg-primary-soft/80 text-primary cursor-pointer"
                      : "hover:bg-page cursor-pointer"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    examResult?.passed
                      ? "bg-success text-white"
                      : stage.type === "exam"
                        ? "bg-primary text-white"
                        : "bg-page border border-border text-text-muted"
                  }`}
                >
                  {examResult?.passed ? "✓" : !allChaptersDone ? "🔒" : "📝"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-text">แบบทดสอบวัดผลปลายภาค</p>
                  <p className={`text-[11px] ${!allChaptersDone ? "font-medium text-danger/80" : "text-text-muted"}`}>
                    {!allChaptersDone
                      ? `กดไม่ได้ — ต้องเรียนให้ครบทั้ง ${totalChapters} บทก่อน (เหลือ ${totalChapters - doneChapters} บท)`
                      : examResult?.passed
                        ? `สอบผ่านแล้ว (${examResult.score}%)`
                        : `${curriculum.questions.length} ข้อ · เกณฑ์ผ่าน 80%`}
                  </p>
                </div>
              </button>

              {/* Certificate Step */}
              <button
                type="button"
                onClick={() => {
                  if (!examResult?.passed) {
                    toast.error(
                      "ยังไม่สามารถเปิดดูใบรับรองได้: ต้องเรียนครบทุกบทและทำแบบทดสอบปลายภาคให้ได้คะแนน 80% ขึ้นไปก่อน",
                    );
                    return;
                  }
                  setStage({ type: "certificate" });
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  !examResult?.passed
                    ? "opacity-60 cursor-not-allowed bg-page/40"
                    : stage.type === "certificate"
                      ? "bg-primary-soft/80 text-primary cursor-pointer"
                      : "hover:bg-page cursor-pointer"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    examResult?.passed
                      ? "bg-success text-white"
                      : "bg-page border border-border text-text-muted"
                  }`}
                >
                  {examResult?.passed ? "🏆" : "🔒"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-text">ใบรับรองการอบรม (E-Certificate)</p>
                  <p className={`text-[11px] ${!examResult?.passed ? "font-medium text-danger/80" : "text-text-muted"}`}>
                    {examResult?.passed ? "คลิกเพื่อดูใบรับรอง" : "กดไม่ได้ — ต้องสอบปลายภาคให้ผ่านเกณฑ์ 80% ก่อน"}
                  </p>
                </div>
              </button>
            </div>
          </Card>

          {/* Right Classroom Stage */}
          <Card className="lg:col-span-8 space-y-6 p-5 sm:p-6">
            {stage.type === "chapter" && (() => {
              const chapter = curriculum.chapters[stage.index];
              const isChecked = Boolean(checkedTakeaway[chapter.id]);
              return (
                <div className="space-y-6">
                  {/* Lesson Header Banner */}
                  <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary-soft/60 to-page border border-primary/20 p-4 sm:p-5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <Badge tone="primary">{chapter.clauseRef}</Badge>
                      <span className="font-semibold text-text-muted">
                        🎬 วิดีโอบทที่ {stage.index + 1} จาก {totalChapters} · ความยาว {chapter.durationMin} นาที
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-extrabold text-text">{chapter.title}</h2>
                  </div>

                  {/* Interactive Lesson Video Player */}
                  <LessonVideoPlayer
                    key={`${chapter.id}-${chapterRetakeCounter[chapter.id] || 0}`}
                    courseCode={activeCourse.code}
                    instructor={curriculum.instructor}
                    chapter={chapter}
                    chapterIndex={stage.index}
                    totalChapters={totalChapters}
                    onVideoCompleted={(result) => {
                      if (result) {
                        setChapterQuizResults((prev) => ({ ...prev, [chapter.id]: result }));
                      }
                      setCheckedTakeaway((prev) => ({ ...prev, [chapter.id]: true }));
                    }}
                  />

                  {/* Compact Key Takeaways & Case Study Summary below video */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/80 bg-page/60 p-3.5 space-y-1.5">
                      <p className="text-xs font-bold text-primary">🎯 วัตถุประสงค์ของวิดีโอบทนี้</p>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-text">
                        {chapter.objectives.map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-page/60 p-3.5 space-y-1.5">
                      <p className="text-xs font-bold text-primary">💡 กรณีศึกษาจากหน้างานจริง</p>
                      <p className="text-xs text-text">{chapter.caseStudy.scenario}</p>
                      <p className="text-xs font-semibold text-success">
                        ✓ แนวทางที่ถูก: {chapter.caseStudy.goodPractice}
                      </p>
                    </div>
                  </div>

                  {/* Takeaway Confirmation Checkbox + Explanation */}
                  <div className="space-y-2.5">
                    <label
                      className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                        isChecked
                          ? "border-success/50 bg-success-soft/30"
                          : "border-warning bg-warning-soft/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setCheckedTakeaway((prev) => ({ ...prev, [chapter.id]: e.target.checked }))
                        }
                        className="mt-0.5 h-4 w-4 accent-primary"
                      />
                      <div className="space-y-1">
                        <span className="block text-xs sm:text-sm font-bold text-text">
                          {chapter.takeaway}
                        </span>
                        <span className="block text-xs text-text-muted">
                          {isChecked
                            ? "✓ ยืนยันความเข้าใจแล้ว สามารถกดปุ่มด้านล่างเพื่อไปบทถัดไปได้"
                            : "⚠️ กรุณาติ๊กช่องนี้หลังจากศึกษาเนื้อหาครบถ้วน เพื่อปลดล็อกปุ่มไปบทถัดไป"}
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Chapter Navigation Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-border/60">
                    {stage.index > 0 ? (
                      <Button
                        variant="secondary"
                        onClick={() => setStage({ type: "chapter", index: stage.index - 1 })}
                      >
                        ← บทก่อนหน้า
                      </Button>
                    ) : (
                      <div />
                    )}

                    <div className="flex flex-col items-end gap-1">
                      <Button
                        variant={isChecked ? "primary" : "secondary"}
                        onClick={() => markChapterComplete(chapter, stage.index)}
                      >
                        {stage.index + 1 < totalChapters
                          ? "บันทึกเรียนจบบทนี้ & ไปบทถัดไป →"
                          : "บันทึกเรียนจบบทสุดท้าย & ประเมินผลและเข้าสู่ห้องสอบ →"}
                      </Button>
                      {!isChecked && (
                        <span className="text-[11px] font-medium text-danger">
                          * กรุณาติ๊ก ✓ ยืนยันความเข้าใจเนื้อหาด้านบนก่อนไปบทถัดไป
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {stage.type === "exam" && (
              <div className="space-y-5">
                {/* Overall Course In-Video Checkpoint Evaluation Card (Evaluated after completing all lessons) */}
                <div
                  className={`rounded-2xl border p-4 sm:p-5 space-y-3.5 ${
                    courseCheckpointSummary.isPassed
                      ? "border-success/40 bg-success-soft/30 text-text"
                      : "border-danger/40 bg-danger-soft/30 text-text"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm ${
                          courseCheckpointSummary.isPassed
                            ? "bg-success text-white"
                            : "bg-danger text-white"
                        }`}
                      >
                        {courseCheckpointSummary.isPassed ? "✓" : "⚠️"}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-text">
                          {courseCheckpointSummary.isPassed
                            ? "ผลการประเมินคำถามระหว่างบทเรียนทั้งหมด: ผ่านเกณฑ์เรียบร้อย"
                            : "ผลการประเมินคำถามระหว่างบทเรียนทั้งหมด: ไม่ผ่านเกณฑ์"}
                        </h3>
                        <p className="text-xs text-text-muted">
                          รวบรวมผลการตอบคำถามระหว่างคลิปครบทุกบทเรียน: ตอบถูก{" "}
                          <strong className="text-text font-bold">
                            {courseCheckpointSummary.totalCorrectCheckpoints} จาก {courseCheckpointSummary.totalCourseCheckpoints} ข้อ
                          </strong>{" "}
                          ({courseCheckpointSummary.scorePct}% · เกณฑ์ผ่าน 80%)
                        </p>
                      </div>
                    </div>

                    <Badge tone={courseCheckpointSummary.isPassed ? "success" : "danger"}>
                      {courseCheckpointSummary.isPassed ? "✓ ผ่านเกณฑ์คำถามในคลิป" : "✗ ไม่ผ่าน — ต้องสอบแก้ตัว"}
                    </Badge>
                  </div>

                  {!courseCheckpointSummary.isPassed ? (
                    <div className="space-y-3 pt-1 border-t border-danger/20">
                      <div className="rounded-xl bg-surface/80 border border-danger/30 p-3 text-xs space-y-1.5">
                        <p className="font-extrabold text-danger">
                          📢 คำเตือนพนักงาน ({learner.name}):
                        </p>
                        <p className="text-text leading-relaxed">
                          ตามมาตรฐานการอบรม ISO คุณต้องตอบคำถามระหว่างคลิปให้ผ่านเกณฑ์ไม่ต่ำกว่า 80% ผลการตอบของคุณยังไม่ผ่านเกณฑ์ ระบบจึงแจ้งเตือนว่า <strong>&ldquo;ไม่ผ่านเกณฑ์&rdquo;</strong> และไม่อนุญาตให้ส่งผลสอบปลายภาค กรุณากดปุ่ม <strong>&ldquo;เริ่มเรียนใหม่และสอบแก้ตัวทุกบทเรียน&rdquo;</strong> ด้านล่างเพื่อทำการเรียนรู้ใหม่
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          {courseCheckpointSummary.chapterBreakdown.map((chB, i) => (
                            <span
                              key={chB.chapterId}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${
                                chB.passed
                                  ? "bg-success-soft/60 border-success/40 text-success"
                                  : "bg-danger-soft/60 border-danger/40 text-danger"
                              }`}
                            >
                              บทที่ {i + 1}: {chB.correct}/{chB.total} ข้อ {chB.passed ? "✓" : "✗"}
                            </span>
                          ))}
                        </div>

                        <Button
                          variant="danger"
                          onClick={handleRetakeCourse}
                          className="font-bold shadow-md cursor-pointer shrink-0"
                        >
                          🔄 เริ่มเรียนใหม่และสอบแก้ตัวทุกบทเรียน (Retake & Retest)
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted leading-relaxed pt-1 border-t border-success/20">
                      🎉 ยินดีด้วย! คุณผ่านเกณฑ์การทำความเข้าใจเนื้อหาระหว่างคลิปครบถ้วน สามารถทำแบบทดสอบวัดผลปลายภาคด้านล่างเพื่อรับใบรับรองการฝึกอบรม (E-Certificate)
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-text">
                      📝 แบบทดสอบประเมินผลปลายภาค: {activeCourse.name}
                    </h2>
                    <p className="text-xs text-text-muted">
                      จำนวน {curriculum.questions.length} ข้อ (ตอบแล้ว {Object.keys(answers).length}/{curriculum.questions.length} ข้อ) · เกณฑ์ผ่าน 80%
                    </p>
                  </div>
                  {examResult && (
                    <Badge tone={examResult.passed ? "success" : "danger"}>
                      คะแนนของคุณ: {examResult.score}/100 ({examResult.passed ? "สอบผ่าน" : "ไม่ผ่านเกณฑ์"})
                    </Badge>
                  )}
                </div>

                {examResult && (
                  <div
                    className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      examResult.passed
                        ? "border-success/40 bg-success-soft/30"
                        : "border-danger/40 bg-danger-soft/30"
                    }`}
                  >
                    <div className="space-y-0.5 text-xs sm:text-sm">
                      <p className="font-bold text-text">
                        {examResult.passed
                          ? `🎉 ยินดีด้วย! คุณสอบผ่านด้วยคะแนน ${examResult.score}/100 คะแนน`
                          : `⚠️ คุณได้คะแนน ${examResult.score}/100 คะแนน (ยังไม่ถึงเกณฑ์ 80%)`}
                      </p>
                      <p className="text-xs text-text-muted">
                        {examResult.passed
                          ? "ระบบได้บันทึกผลการอบรมและวันหมดอายุใบรับรองลงในหน้า 'อบรมและสมรรถนะ' เรียบร้อยแล้ว"
                          : "สามารถศึกษาคำอธิบายเฉลยด้านล่าง เลือกคำตอบใหม่ แล้วกดส่งกระดาษคำตอบอีกครั้งได้ทันที"}
                      </p>
                    </div>
                    {examResult.passed && (
                      <Button variant="success" size="sm" onClick={() => setStage({ type: "certificate" })}>
                        🎓 ดูใบรับรอง (Certificate)
                      </Button>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {curriculum.questions.map((q, qIdx) => {
                    const selected = answers[qIdx];
                    const showFeedback = examResult !== null;
                    return (
                      <div key={qIdx} className="rounded-xl border border-border/80 bg-page/50 p-4 space-y-3">
                        <p className="font-bold text-text text-xs sm:text-sm">{q.question}</p>
                        <div className="space-y-2">
                          {q.choices.map((choice, cIdx) => {
                            const isSelected = selected === cIdx;
                            const isCorrect = q.answerIndex === cIdx;
                            return (
                              <label
                                key={cIdx}
                                className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors ${
                                  showFeedback && isCorrect
                                    ? "border-success bg-success-soft/40 font-semibold text-text"
                                    : showFeedback && isSelected && !isCorrect
                                      ? "border-danger bg-danger-soft/40 text-danger"
                                      : isSelected
                                        ? "border-primary bg-primary-soft/60 font-semibold text-primary"
                                        : "border-border/70 bg-surface text-text hover:bg-page"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`exam-q-${qIdx}`}
                                  checked={isSelected}
                                  onChange={() => setAnswers((prev) => ({ ...prev, [qIdx]: cIdx }))}
                                  className="mt-0.5 accent-primary"
                                />
                                <span>{choice}</span>
                              </label>
                            );
                          })}
                        </div>
                        {showFeedback && (
                          <p className="rounded-lg bg-surface border border-border/60 px-3 py-2 text-xs text-text-muted">
                            <strong className="text-primary">คำอธิบาย:</strong> {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
                  <Button
                    variant="secondary"
                    onClick={() => setStage({ type: "chapter", index: totalChapters - 1 })}
                    disabled={pending}
                  >
                    ← กลับไปทบทวนบทเรียน
                  </Button>
                  <Button
                    variant={courseCheckpointSummary.isPassed ? "success" : "secondary"}
                    onClick={handleSubmitExam}
                    disabled={pending || !courseCheckpointSummary.isPassed}
                  >
                    {!courseCheckpointSummary.isPassed
                      ? "🔒 ต้องผ่านเกณฑ์คำถามในคลิปก่อน (กดสอบแก้ตัวด้านบน)"
                      : pending
                        ? "กำลังตรวจและบันทึกผล..."
                        : "ส่งกระดาษคำตอบ & บันทึกผล"}
                  </Button>
                </div>
              </div>
            )}

            {stage.type === "certificate" && examResult?.passed && (
              <div className="space-y-5">
                <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-primary-soft/40 via-surface to-primary-soft/20 p-6 sm:p-8 text-center space-y-4 shadow-card">
                  <p className="text-xs font-extrabold tracking-widest uppercase text-primary">
                    CERTIFICATE OF COMPLETION · ISO TRAINING SYSTEM
                  </p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-text">
                    ใบรับรองการผ่านการฝึกอบรมออนไลน์
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted">ขอมอบใบรับรองฉบับนี้เพื่อแสดงว่า</p>

                  <div className="py-2">
                    <p className="text-lg sm:text-xl font-extrabold text-primary">{learner.name}</p>
                    <p className="text-xs text-text-muted">
                      ตำแหน่ง: {learner.position} · แผนก: {departmentName(user.departmentId, lang)}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-text">
                    ได้ผ่านการศึกษาบทเรียนและสอบผ่านเกณฑ์มาตรฐานในหลักสูตร
                  </p>
                  <div className="inline-block rounded-xl border border-primary/30 bg-surface px-5 py-3">
                    <p className="text-base sm:text-lg font-extrabold text-text">{activeCourse.name}</p>
                    <p className="text-xs text-text-muted">
                      รหัสหลักสูตร: {activeCourse.code} · มาตรฐาน: {activeCourse.standardLabel} · คะแนนสอบ:{" "}
                      <strong className="text-success">{examResult.score}/100</strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border/60 text-xs text-text-muted max-w-lg mx-auto">
                    <div>
                      <p>ระยะเวลาหลักสูตร</p>
                      <strong className="text-text">{activeCourse.durationHours ?? 4} ชั่วโมง</strong>
                    </div>
                    <div>
                      <p>อายุใบรับรอง</p>
                      <strong className="text-text">{activeCourse.validityMonths ?? 12} เดือน</strong>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p>วิทยากรผู้รับรอง</p>
                      <strong className="text-text">{curriculum.instructor}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button variant="secondary" onClick={() => setActiveCourse(null)}>
                    ← กลับหน้ารวมหลักสูตร E-Learning
                  </Button>
                  <Link
                    href="/training"
                    className="inline-flex h-10 items-center rounded-control bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-hover transition-colors"
                  >
                    เปิดดูในหน้า อบรมและสมรรถนะ →
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>

        {editingCourse && (
          <ElearningEditorModal
            courseId={editingCourse.id}
            courseName={editingCourse.name}
            initialCurriculum={resolveCurriculum(editingCourse)}
            onClose={() => setEditingCourse(null)}
            onSaved={handleCurriculumSaved}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t.nav.elearning}
        description={t.pages.elearning}
        actions={
          <Link
            href="/training"
            className="inline-flex h-10 items-center rounded-control border border-border bg-surface px-3.5 text-xs font-semibold text-primary hover:bg-primary-soft transition-colors"
          >
            ดูประวัติการอบรมทั้งหมด →
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile label="หลักสูตรออนไลน์ทั้งหมด" value={`${courseList.length} หลักสูตร`} icon="🎓" />
        <StatTile label="เรียนและสอบผ่านแล้ว" value={`${passedCount} หลักสูตร`} accent="success" icon="✓" />
        <StatTile label="รอดำเนินการ / รอสอบ" value={`${remainingCount} หลักสูตร`} accent="neutral" icon="⏳" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courseList.map((c) => {
          const rec = c.myRecord;
          const isPassed = rec?.status === "completed" && rec.passed;
          const curriculum = resolveCurriculum(c);
          return (
            <Card key={c.id} className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-primary">{c.code}</span>
                    <Badge tone="purple">{c.standardLabel}</Badge>
                  </div>
                  {isPassed ? (
                    <Badge tone="success">ผ่านแล้ว ({rec.score}/100)</Badge>
                  ) : rec?.status === "completed" ? (
                    <Badge tone="danger">ยังไม่ผ่าน ({rec.score}/100)</Badge>
                  ) : (
                    <Badge tone="neutral">ยังไม่เรียน</Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-text">{c.name}</h3>
                  {c.description && <p className="mt-1 text-xs text-text-muted">{c.description}</p>}
                </div>

                {/* Clean Course Structure Preview */}
                <div className="rounded-xl bg-page/60 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted px-1">
                    <span>โครงสร้างหลักสูตร (เรียนตามลำดับ {curriculum.chapters.length} บท)</span>
                    <span>สอบ {curriculum.questions.length} ข้อ</span>
                  </div>
                  <div className="divide-y divide-border/50 rounded-lg border border-border/60 bg-surface">
                    {curriculum.chapters.map((ch, idx) => (
                      <div
                        key={ch.id}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            idx === 0 ? "bg-primary-soft text-primary" : "bg-page text-text-muted"
                          }`}
                        >
                          {idx === 0 ? "1" : "🔒"}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-text">
                          {ch.title.replace(/^บทที่\s*\d+\s*:\s*/, "")}
                        </span>
                        <span className="shrink-0 text-[11px] text-text-muted">{ch.durationMin} น.</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                  <span>⏱ รวม {c.durationHours ? `${c.durationHours} ชั่วโมง` : "ไม่จำกัด"}</span>
                  <span>🔄 อายุใบรับรอง {c.validityMonths ? `${c.validityMonths} เดือน` : "ตลอดชีพ"}</span>
                </div>

                {rec?.completedDate && (
                  <div className="rounded-lg bg-success-soft/30 border border-success/30 px-3 py-2 text-xs text-text">
                    สอบผ่านล่าสุด: <strong>{formatDate(rec.completedDate, lang)}</strong>
                    {rec.expiryDate && (
                      <>
                        {" · "}หมดอายุ: <strong>{formatDate(rec.expiryDate, lang)}</strong>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setEditingCourse(c)}
                    className="rounded-lg border border-border bg-page px-2.5 py-1.5 text-xs font-bold text-text hover:border-primary/40 hover:bg-primary-soft hover:text-primary transition-colors cursor-pointer"
                  >
                    ⚙️ จัดการบทเรียน & ข้อสอบ
                  </button>
                ) : (
                  <span className="text-xs text-text-muted">เรียนครบ {curriculum.chapters.length} บท + สอบ ≥ 80%</span>
                )}
                <div className="flex items-center gap-1.5">
                  {isPassed && (
                    <Button size="sm" variant="secondary" onClick={() => enterClassroom(c, "certificate")}>
                      🎓 ใบรับรอง
                    </Button>
                  )}
                  <Button size="sm" variant="primary" onClick={() => enterClassroom(c, "learn")}>
                    {isPassed ? "📖 เริ่มเรียนทบทวนใหม่" : "📖 เริ่มเรียนบทที่ 1 →"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {editingCourse && (
        <ElearningEditorModal
          courseId={editingCourse.id}
          courseName={editingCourse.name}
          initialCurriculum={resolveCurriculum(editingCourse)}
          onClose={() => setEditingCourse(null)}
          onSaved={handleCurriculumSaved}
        />
      )}
    </>
  );
}
