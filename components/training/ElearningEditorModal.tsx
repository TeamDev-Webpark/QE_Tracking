"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Modal, Textarea, useToast } from "@/components/ui";
import { PlusIcon, TrashIcon } from "@/components/icons";
import type { CourseCurriculum, LessonChapter, QuizQuestion } from "@/data/elearningCurriculum";
import { saveCourseCurriculum } from "@/lib/training/elearningActions";

export function ElearningEditorModal({
  courseId,
  courseName,
  initialCurriculum,
  onClose,
}: {
  courseId: string;
  courseName: string;
  initialCurriculum: CourseCurriculum;
  onClose: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"chapters" | "questions">("chapters");

  const [instructor, setInstructor] = useState(initialCurriculum.instructor);
  const [targetAudience, setTargetAudience] = useState(initialCurriculum.targetAudience);
  const [chapters, setChapters] = useState<LessonChapter[]>(() => structuredClone(initialCurriculum.chapters));
  const [selectedChIdx, setSelectedChIdx] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => structuredClone(initialCurriculum.questions));

  const safeChIdx = Math.min(selectedChIdx, Math.max(0, chapters.length - 1));
  const currentChapter = chapters[safeChIdx];

  const updateChapter = (patch: Partial<LessonChapter>) => {
    setChapters((prev) => prev.map((ch, idx) => (idx === safeChIdx ? { ...ch, ...patch } : ch)));
  };

  const handleAddChapter = () => {
    const nextNum = chapters.length + 1;
    const newCh: LessonChapter = {
      id: `ch-${Date.now()}`,
      title: `บทที่ ${nextNum}: หัวข้อบทเรียนใหม่`,
      durationMin: 20,
      clauseRef: "ISO 9001:2015",
      objectives: ["เข้าใจหลักการและขั้นตอนการปฏิบัติงานตามมาตรฐาน"],
      articles: [
        {
          heading: `1. เนื้อหาหลักประจำบทที่ ${nextNum}`,
          paragraphs: ["กรอกรายละเอียดเนื้อหาบทเรียนและคำอธิบายขั้นตอนการปฏิบัติงานที่นี่..."],
          bullets: ["ประเด็นสำคัญข้อที่ 1", "ประเด็นสำคัญข้อที่ 2"],
        },
      ],
      keyConcepts: [
        {
          heading: "สรุปใจความสำคัญ",
          detail: "สรุปสิ่งที่ผู้เรียนต้องนำไปปฏิบัติจริงในหน้างาน",
        },
      ],
      guidelines: ["ตรวจสอบความถูกต้องตามมาตรฐานก่อนเริ่มงานทุกครั้ง"],
      caseStudy: {
        scenario: "ตัวอย่างสถานการณ์ที่อาจพบในหน้างานจริง",
        goodPractice: "แนวทางปฏิบัติที่ถูกต้องตามมาตรฐาน ISO",
        badPractice: "ข้อผิดพลาดที่ห้ามปฏิบัติ",
      },
      takeaway: `ข้าพเจ้าได้ศึกษาและเข้าใจเนื้อหาบทที่ ${nextNum} ครบถ้วนแล้ว`,
    };
    setChapters((prev) => [...prev, newCh]);
    setSelectedChIdx(chapters.length);
  };

  const handleDeleteChapter = (idx: number) => {
    if (chapters.length <= 1) {
      toast.error("ต้องมีบทเรียนอย่างน้อย 1 บท");
      return;
    }
    setChapters((prev) => prev.filter((_, i) => i !== idx));
    setSelectedChIdx((prev) => Math.max(0, prev - 1));
  };

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1;
    setQuestions((prev) => [
      ...prev,
      {
        question: `${nextNum}. คำถามข้อที่ ${nextNum}?`,
        choices: ["ตัวเลือกที่ 1 (คำตอบที่ถูก)", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3", "ตัวเลือกที่ 4"],
        answerIndex: 0,
        explanation: "คำอธิบายเหตุผลของคำตอบที่ถูกต้อง",
      },
    ]);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      toast.error("ต้องมีข้อสอบอย่างน้อย 1 ข้อ");
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveCourseCurriculum(courseId, {
        instructor: instructor.trim() || "ทีมวิทยากรระบบคุณภาพ",
        targetAudience: targetAudience.trim() || "พนักงานทุกแผนก",
        chapters,
        questions,
      });
      if (!res.ok) {
        toast.error(res.error ?? "ไม่สามารถบันทึกเนื้อหาได้");
        return;
      }
      toast.success(`บันทึกเนื้อหาบทเรียน (${chapters.length} บท) และข้อสอบ (${questions.length} ข้อ) เรียบร้อยแล้ว`);
      onClose();
    });
  };

  return (
    <Modal
      open
      size="xl"
      onClose={pending ? () => {} : onClose}
      title={`จัดการบทเรียน & ข้อสอบ: ${courseName}`}
      closeLabel="ปิด"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs text-text-muted">
            รวมทั้งหมด {chapters.length} บทเรียน · ข้อสอบ {questions.length} ข้อ
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              ยกเลิก
            </Button>
            <Button variant="success" onClick={handleSave} disabled={pending}>
              {pending ? "กำลังบันทึก..." : "บันทึกเนื้อหา & ข้อสอบ"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-sm">
        {/* Top Navigation Tabs + Course Metadata */}
        <div className="space-y-4 border-b border-border/60 pb-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-page p-1">
            <button
              type="button"
              onClick={() => setTab("chapters")}
              className={`rounded-lg py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                tab === "chapters"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              📚 1. จัดการเนื้อหาบทเรียน ({chapters.length} บท)
            </button>
            <button
              type="button"
              onClick={() => setTab("questions")}
              className={`rounded-lg py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                tab === "questions"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              📝 2. จัดการข้อสอบปลายภาค ({questions.length} ข้อ)
            </button>
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field htmlFor="ed-instructor" label="ชื่อผู้สอน / วิทยากร">
              <Input
                id="ed-instructor"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="เช่น อาจารย์สมชาย ใจดี (QMR)"
              />
            </Field>
            <Field htmlFor="ed-audience" label="กลุ่มเป้าหมายผู้เรียน">
              <Input
                id="ed-audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="เช่น พนักงานทุกแผนก / หัวหน้างาน"
              />
            </Field>
          </div>
        </div>

        {tab === "chapters" && currentChapter && (
          <div className="space-y-5">
            {/* Chapter Pills Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-page/60 p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {chapters.map((ch, idx) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChIdx(idx)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      idx === safeChIdx
                        ? "bg-primary text-white shadow-2xs"
                        : "bg-surface border border-border text-text hover:border-primary/40"
                    }`}
                  >
                    บทที่ {idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary bg-surface px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary-soft/50 cursor-pointer"
                >
                  <PlusIcon width={14} height={14} />
                  เพิ่มบทเรียนใหม่
                </button>
              </div>

              {chapters.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteChapter(safeChIdx)}
                  className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger-soft/40 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                >
                  <TrashIcon width={14} height={14} />
                  ลบบทที่ {safeChIdx + 1}
                </button>
              )}
            </div>

            {/* Section 1: Basic Info */}
            <div className="rounded-xl border border-border/80 bg-surface p-4 sm:p-5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary border-b border-border/60 pb-2">
                ส่วนที่ 1: ข้อมูลทั่วไปของบทที่ {safeChIdx + 1}
              </h3>

              <Field htmlFor="ch-title" label={`ชื่อบทเรียน (บทที่ ${safeChIdx + 1})`}>
                <Input
                  id="ch-title"
                  value={currentChapter.title}
                  onChange={(e) => updateChapter({ title: e.target.value })}
                />
              </Field>

              <div className="grid items-start gap-4 sm:grid-cols-2">
                <Field htmlFor="ch-clause" label="ข้อกำหนดมาตรฐานอ้างอิง">
                  <Input
                    id="ch-clause"
                    value={currentChapter.clauseRef}
                    onChange={(e) => updateChapter({ clauseRef: e.target.value })}
                    placeholder="เช่น ISO 9001 ข้อ 8.7 และ 10.2"
                  />
                </Field>
                <Field htmlFor="ch-min" label="เวลาศึกษาโดยประมาณ (นาที)">
                  <Input
                    id="ch-min"
                    type="number"
                    min={5}
                    value={String(currentChapter.durationMin)}
                    onChange={(e) => updateChapter({ durationMin: Number(e.target.value) || 15 })}
                  />
                </Field>
              </div>

              <Field
                htmlFor="ch-obj"
                label="วัตถุประสงค์การเรียนรู้ประจำบท (พิมพ์ 1 บรรทัด ต่อ 1 ข้อ)"
              >
                <Textarea
                  id="ch-obj"
                  rows={2}
                  value={currentChapter.objectives.join("\n")}
                  onChange={(e) =>
                    updateChapter({
                      objectives: e.target.value.split("\n").filter((s) => s.trim() !== ""),
                    })
                  }
                />
              </Field>
            </div>

            {/* Section 2: Lecture Articles */}
            <div className="rounded-xl border border-border/80 bg-surface p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary">
                  ส่วนที่ 2: เนื้อหาบรรยายฉบับเต็ม ({currentChapter.articles.length} หัวข้อย่อย)
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    updateChapter({
                      articles: [
                        ...currentChapter.articles,
                        {
                          heading: `${currentChapter.articles.length + 1}. หัวข้อเนื้อหาย่อยใหม่`,
                          paragraphs: ["รายละเอียดเนื้อหา..."],
                        },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-3 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                >
                  <PlusIcon width={13} height={13} />
                  เพิ่มหัวข้อเนื้อหาย่อย
                </button>
              </div>

              <div className="space-y-4">
                {currentChapter.articles.map((art, aIdx) => (
                  <div key={aIdx} className="rounded-xl border border-border/70 bg-page/30 p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-text">หัวข้อย่อยที่ {aIdx + 1}</span>
                      {currentChapter.articles.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateChapter({
                              articles: currentChapter.articles.filter((_, i) => i !== aIdx),
                            })
                          }
                          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold text-danger hover:bg-danger-soft cursor-pointer"
                        >
                          <TrashIcon width={13} height={13} />
                          ลบหัวข้อนี้
                        </button>
                      )}
                    </div>

                    <Field htmlFor={`art-head-${aIdx}`} label="ชื่อหัวข้อย่อย">
                      <Input
                        id={`art-head-${aIdx}`}
                        value={art.heading}
                        onChange={(e) => {
                          const next = [...currentChapter.articles];
                          next[aIdx] = { ...art, heading: e.target.value };
                          updateChapter({ articles: next });
                        }}
                        className="bg-surface font-semibold"
                        placeholder="ชื่อหัวข้อเนื้อหาย่อย"
                      />
                    </Field>

                    <Field
                      htmlFor={`art-body-${aIdx}`}
                      label="เนื้อหาบรรยาย (เว้น 1 บรรทัดว่างเพื่อขึ้นย่อหน้าใหม่)"
                    >
                      <Textarea
                        id={`art-body-${aIdx}`}
                        rows={4}
                        value={art.paragraphs.join("\n\n")}
                        onChange={(e) => {
                          const next = [...currentChapter.articles];
                          next[aIdx] = {
                            ...art,
                            paragraphs: e.target.value
                              .split(/\n\s*\n/)
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          updateChapter({ articles: next });
                        }}
                        className="bg-surface"
                        placeholder="กรอกเนื้อหาบรรยาย..."
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Guidelines, Case Study & Takeaway */}
            <div className="rounded-xl border border-border/80 bg-surface p-4 sm:p-5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary border-b border-border/60 pb-2">
                ส่วนที่ 3: แนวทางปฏิบัติ กรณีศึกษา และการยืนยันท้ายบท
              </h3>

              <Field
                htmlFor="ch-guide"
                label="แนวทางปฏิบัติสำหรับผู้ปฏิบัติงาน (พิมพ์ 1 บรรทัด ต่อ 1 ข้อ)"
              >
                <Textarea
                  id="ch-guide"
                  rows={2}
                  value={currentChapter.guidelines.join("\n")}
                  onChange={(e) =>
                    updateChapter({
                      guidelines: e.target.value.split("\n").filter((s) => s.trim() !== ""),
                    })
                  }
                />
              </Field>

              <Field htmlFor="ch-case" label="สถานการณ์ตัวอย่างหน้างานจริง (Case Study)">
                <Input
                  id="ch-case"
                  value={currentChapter.caseStudy.scenario}
                  onChange={(e) =>
                    updateChapter({
                      caseStudy: { ...currentChapter.caseStudy, scenario: e.target.value },
                    })
                  }
                />
              </Field>

              <div className="grid items-start gap-4 sm:grid-cols-2">
                <Field htmlFor="ch-good" label="✓ แนวทางที่ถูกต้องตามมาตรฐาน ISO">
                  <Textarea
                    id="ch-good"
                    rows={2}
                    value={currentChapter.caseStudy.goodPractice}
                    onChange={(e) =>
                      updateChapter({
                        caseStudy: { ...currentChapter.caseStudy, goodPractice: e.target.value },
                      })
                    }
                    className="border-success/40"
                  />
                </Field>
                <Field htmlFor="ch-bad" label="✗ ข้อบกพร่องที่ห้ามปฏิบัติ">
                  <Textarea
                    id="ch-bad"
                    rows={2}
                    value={currentChapter.caseStudy.badPractice}
                    onChange={(e) =>
                      updateChapter({
                        caseStudy: { ...currentChapter.caseStudy, badPractice: e.target.value },
                      })
                    }
                    className="border-danger/40"
                  />
                </Field>
              </div>

              <Field htmlFor="ch-takeaway" label="ข้อความติ๊กยืนยันความเข้าใจท้ายบทเรียน">
                <Input
                  id="ch-takeaway"
                  value={currentChapter.takeaway}
                  onChange={(e) => updateChapter({ takeaway: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}

        {tab === "questions" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-page/60 p-3">
              <p className="text-xs text-text-muted">
                คลิกปุ่มวงกลมหน้าตัวเลือกเพื่อกำหนดเป็น <strong className="text-success">คำตอบที่ถูกต้อง (เฉลย)</strong>
              </p>
              <Button size="sm" onClick={handleAddQuestion}>
                <PlusIcon width={14} height={14} />
                เพิ่มข้อสอบข้อใหม่
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="rounded-xl border border-border/80 bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <span className="text-xs font-extrabold text-primary">ข้อสอบข้อที่ {qIdx + 1}</span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold text-danger hover:bg-danger-soft cursor-pointer"
                      >
                        <TrashIcon width={13} height={13} />
                        ลบข้อนี้
                      </button>
                    )}
                  </div>

                  <Field htmlFor={`q-title-${qIdx}`} label="โจทย์คำถาม">
                    <Input
                      id={`q-title-${qIdx}`}
                      value={q.question}
                      onChange={(e) => {
                        const next = [...questions];
                        next[qIdx] = { ...q, question: e.target.value };
                        setQuestions(next);
                      }}
                      placeholder="พิมพ์โจทย์คำถาม..."
                      className="font-semibold"
                    />
                  </Field>

                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-text-muted">
                      ตัวเลือกคำตอบ (คลิกวงกลมหน้าข้อที่ถูก)
                    </span>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {q.choices.map((ch, cIdx) => {
                        const isCorrect = q.answerIndex === cIdx;
                        return (
                          <div
                            key={cIdx}
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                              isCorrect ? "border-success bg-success-soft/30" : "border-border/70 bg-page/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`ans-${qIdx}`}
                              checked={isCorrect}
                              onChange={() => {
                                const next = [...questions];
                                next[qIdx] = { ...q, answerIndex: cIdx };
                                setQuestions(next);
                              }}
                              title="เลือกเป็นคำตอบที่ถูกต้อง"
                              className="h-4 w-4 shrink-0 accent-success cursor-pointer"
                            />
                            <input
                              type="text"
                              value={ch}
                              onChange={(e) => {
                                const nextChoices = [...q.choices];
                                nextChoices[cIdx] = e.target.value;
                                const next = [...questions];
                                next[qIdx] = { ...q, choices: nextChoices };
                                setQuestions(next);
                              }}
                              className="h-8 w-full bg-transparent text-xs text-text outline-none"
                              placeholder={`ตัวเลือกที่ ${cIdx + 1}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Field htmlFor={`q-exp-${qIdx}`} label="คำอธิบายเฉลย (แสดงให้ผู้เรียนเห็นหลังส่งคำตอบ)">
                    <Input
                      id={`q-exp-${qIdx}`}
                      value={q.explanation}
                      onChange={(e) => {
                        const next = [...questions];
                        next[qIdx] = { ...q, explanation: e.target.value };
                        setQuestions(next);
                      }}
                      placeholder="คำอธิบายเหตุผลของคำตอบที่ถูกต้อง..."
                    />
                  </Field>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
