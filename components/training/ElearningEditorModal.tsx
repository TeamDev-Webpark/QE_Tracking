"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Modal, Textarea, useToast } from "@/components/ui";
import { PlusIcon, TrashIcon } from "@/components/icons";
import type {
  CourseCurriculum,
  LessonChapter,
  QuizQuestion,
  VideoCheckpoint,
} from "@/data/elearningCurriculum";
import { saveCourseCurriculum } from "@/lib/training/elearningActions";
import { formatMmSs } from "./LessonVideoPlayer";
import { parseVideoSource } from "./videoUtils";

/** Calculate comfortable rows so textarea never cuts text in half with a tiny scrollbar. */
function autoRows(text: string, minRows = 3): number {
  if (!text) return minRows;
  const lines = text.split("\n");
  const totalLines = lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 75)), 0);
  return Math.max(minRows, Math.min(16, totalLines + 1));
}

export function ElearningEditorModal({
  courseId,
  courseName,
  initialCurriculum,
  onClose,
  onSaved,
}: {
  courseId: string;
  courseName: string;
  initialCurriculum: CourseCurriculum;
  onClose: () => void;
  onSaved?: (updated: CourseCurriculum) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [previewCurrentSec, setPreviewCurrentSec] = useState(10);
  const [tab, setTab] = useState<"chapters" | "questions">("chapters");
  const [chapterSubTab, setChapterSubTab] = useState<"info" | "articles" | "case">("info");

  const [instructor, setInstructor] = useState(initialCurriculum.instructor);
  const [targetAudience, setTargetAudience] = useState(initialCurriculum.targetAudience);
  const [chapters, setChapters] = useState<LessonChapter[]>(() => structuredClone(initialCurriculum.chapters));
  const [selectedChIdx, setSelectedChIdx] = useState(0);
  const [selectedArtIdx, setSelectedArtIdx] = useState(0);

  const [questions, setQuestions] = useState<QuizQuestion[]>(() => structuredClone(initialCurriculum.questions));
  const [selectedQIdx, setSelectedQIdx] = useState(0);

  const safeChIdx = Math.min(selectedChIdx, Math.max(0, chapters.length - 1));
  const currentChapter = chapters[safeChIdx];
  const safeArtIdx = currentChapter
    ? Math.min(selectedArtIdx, Math.max(0, currentChapter.articles.length - 1))
    : 0;
  const currentArticle = currentChapter?.articles[safeArtIdx];

  const safeQIdx = Math.min(selectedQIdx, Math.max(0, questions.length - 1));
  const currentQuestion = questions[safeQIdx];

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
    setSelectedArtIdx(0);
    setChapterSubTab("info");
  };

  const handleDeleteChapter = (idx: number) => {
    if (chapters.length <= 1) {
      toast.error("ต้องมีบทเรียนอย่างน้อย 1 บท");
      return;
    }
    setChapters((prev) => prev.filter((_, i) => i !== idx));
    setSelectedChIdx((prev) => Math.max(0, prev - 1));
    setSelectedArtIdx(0);
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
    setSelectedQIdx(questions.length);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      toast.error("ต้องมีข้อสอบอย่างน้อย 1 ข้อ");
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setSelectedQIdx((prev) => Math.max(0, prev - 1));
  };

  const handleSave = () => {
    if (uploadingVideo) {
      toast.error("กรุณารอให้อัปโหลดวิดีโอจากเครื่องเสร็จสิ้นก่อนกดบันทึก");
      return;
    }
    const hasBlob = chapters.some((ch) => ch.videoUrl?.startsWith("blob:"));
    if (hasBlob) {
      toast.error("ไฟล์วิดีโอยังอัปโหลดไม่เสร็จสมบูรณ์ กรุณารอสักครู่หรือเลือกไฟล์ใหม่อีกครั้ง");
      return;
    }

    startTransition(async () => {
      const updated: CourseCurriculum = {
        instructor: instructor.trim() || "ทีมวิทยากรระบบคุณภาพ",
        targetAudience: targetAudience.trim() || "พนักงานทุกแผนก",
        chapters,
        questions,
      };
      const res = await saveCourseCurriculum(courseId, updated);
      if (!res.ok) {
        toast.error(res.error ?? "ไม่สามารถบันทึกเนื้อหาได้");
        return;
      }
      toast.success(`บันทึกเนื้อหาบทเรียน (${chapters.length} บท) และข้อสอบ (${questions.length} ข้อ) เรียบร้อยแล้ว`);
      onSaved?.(updated);
      router.refresh();
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
      <div className="space-y-4 text-sm">
        {/* Main Mode Switcher: Lessons vs Exam */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-page p-1.5">
          <button
            type="button"
            onClick={() => setTab("chapters")}
            className={`rounded-lg py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              tab === "chapters"
                ? "bg-primary text-white shadow-xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            📚 จัดการเนื้อหาบทเรียน ({chapters.length} บท)
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
            📝 จัดการข้อสอบปลายภาค ({questions.length} ข้อ)
          </button>
        </div>

        {tab === "chapters" && currentChapter && (
          <div className="space-y-4">
            {/* Chapter Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-page/50 p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {chapters.map((ch, idx) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setSelectedChIdx(idx);
                      setSelectedArtIdx(0);
                    }}
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
                  เพิ่มบทใหม่
                </button>
              </div>

              {chapters.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteChapter(safeChIdx)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft cursor-pointer"
                >
                  <TrashIcon width={14} height={14} />
                  ลบบทที่ {safeChIdx + 1}
                </button>
              )}
            </div>

            {/* 3 Clean Sub-tabs for the selected chapter */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 pb-3">
              <button
                type="button"
                onClick={() => setChapterSubTab("info")}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  chapterSubTab === "info"
                    ? "bg-primary-soft text-primary border border-primary/30"
                    : "bg-surface text-text-muted hover:bg-page hover:text-text"
                }`}
              >
                ① ข้อมูลบทเรียน & วัตถุประสงค์ ({currentChapter.objectives.length} ข้อ)
              </button>
              <button
                type="button"
                onClick={() => setChapterSubTab("articles")}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  chapterSubTab === "articles"
                    ? "bg-primary-soft text-primary border border-primary/30"
                    : "bg-surface text-text-muted hover:bg-page hover:text-text"
                }`}
              >
                ② เนื้อหาบรรยายในบทนี้ ({currentChapter.articles.length} หัวข้อย่อย)
              </button>
              <button
                type="button"
                onClick={() => setChapterSubTab("case")}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  chapterSubTab === "case"
                    ? "bg-primary-soft text-primary border border-primary/30"
                    : "bg-surface text-text-muted hover:bg-page hover:text-text"
                }`}
              >
                ③ แนวทางปฏิบัติ & กรณีศึกษา
              </button>
            </div>

            {/* SUB-TAB 1: Chapter Info & Objectives (1 row per item, no cramped textarea!) */}
            {chapterSubTab === "info" && (
              <div className="space-y-4 rounded-xl border border-border/80 bg-surface p-4 sm:p-5">
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
                  <Field htmlFor="ch-min" label="ความยาววิดีโอโดยประมาณ (นาที)">
                    <Input
                      id="ch-min"
                      type="number"
                      min={5}
                      value={String(currentChapter.durationMin)}
                      onChange={(e) => updateChapter({ durationMin: Number(e.target.value) || 15 })}
                    />
                  </Field>
                </div>

                {/* Video & Checkpoints Section — Modern Clean White & Sky Blue Theme */}
                <div className="rounded-2xl border border-sky-200/80 bg-white shadow-xs overflow-hidden">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50/80 via-sky-50/30 to-white px-4 sm:px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white shadow-2xs text-sm">
                        🎬
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800">วิดีโอบทเรียน (Lesson Video)</h4>
                          {currentChapter.videoUrl ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              เชื่อมต่อคลิปแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
                              ใช้สไลด์จำลอง
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          รองรับ YouTube (ปกติ / Shorts), Google Drive หรืออัปโหลดไฟล์ตรงจากเครื่อง
                        </p>
                      </div>
                    </div>

                    {currentChapter.videoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          updateChapter({ videoUrl: "" });
                          toast.info("เปลี่ยนกลับเป็นสไลด์วิดีโอจำลองของระบบแล้ว");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer"
                        title="ลบวิดีโอและใช้สไลด์จำลอง"
                      >
                        ✕ นำคลิปออก
                      </button>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Combined Link Input + Upload Button */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="ch-video" className="block text-xs font-bold text-slate-700">
                          ลิงก์วิดีโอ หรือเลือกไฟล์จากเครื่อง
                        </label>
                        <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-full font-mono">
                          ความชัด 240p – 720p
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            id="ch-video"
                            type="text"
                            value={currentChapter.videoUrl ?? ""}
                            onChange={(e) => updateChapter({ videoUrl: e.target.value })}
                            placeholder="วางลิงก์ https://www.youtube.com/watch?v=... หรือลิงก์ Google Drive..."
                            className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50/50 px-3 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
                          />
                        </div>

                        <label className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 text-xs font-bold text-white hover:bg-sky-700 transition-colors cursor-pointer shadow-2xs whitespace-nowrap">
                          <span>{uploadingVideo ? "⏳ กำลังอัปโหลด..." : "📁 เลือกไฟล์จากเครื่อง"}</span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/ogg,video/quicktime"
                            disabled={uploadingVideo}
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (!file) return;

                              if (file.size > 200 * 1024 * 1024) {
                                toast.error("ไฟล์วิดีโอมีขนาดใหญ่เกิน 200MB แนะนำให้อัปโหลดผ่าน YouTube หรือ Google Drive เพื่อการรับชมที่เสถียรกว่า");
                                return;
                              }

                              // Immediate local preview so user sees video right away!
                              const blobUrl = URL.createObjectURL(file);
                              updateChapter({ videoUrl: blobUrl });

                              // Check resolution bounds (min 240p, max 720p)
                              try {
                                const tempVid = document.createElement("video");
                                tempVid.preload = "metadata";
                                tempVid.src = blobUrl;
                                tempVid.onloadedmetadata = () => {
                                  const h = tempVid.videoHeight;
                                  if (h > 0 && h < 240) {
                                    toast.info(`ความละเอียดไฟล์คือ ${h}p ต่ำกว่าเกณฑ์ขั้นต่ำ 240p อาจทำให้ภาพไม่คมชัด`);
                                  } else if (h > 720) {
                                    toast.info(`ไฟล์มีความละเอียด ${h}p ระบบจะจำกัดการแสดงผลสูงสุดที่ 720p เพื่อประหยัดแบนด์วิดท์`);
                                  }
                                };
                              } catch {}

                              setUploadingVideo(true);
                              try {
                                const uploadUrl = `/api/upload-video?name=${encodeURIComponent(file.name)}`;
                                const res = await fetch(uploadUrl, {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": file.type || "video/mp4",
                                    "x-filename": encodeURIComponent(file.name),
                                  },
                                  body: file,
                                });

                                const contentType = res.headers.get("content-type") || "";
                                if (!res.ok || !contentType.includes("application/json")) {
                                  let errorMsg = `เซิร์ฟเวอร์ตอบกลับรหัส ${res.status}`;
                                  try {
                                    const errJson = await res.json();
                                    if (errJson.error) errorMsg = errJson.error;
                                  } catch {}
                                  toast.error(`อัปโหลดไฟล์วิดีโอไม่สำเร็จ: ${errorMsg}`);
                                  updateChapter({ videoUrl: "" });
                                  return;
                                }

                                const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
                                if (!json.ok || !json.url) {
                                  toast.error(json.error ?? "อัปโหลดไฟล์วิดีโอไม่สำเร็จ");
                                  updateChapter({ videoUrl: "" });
                                } else {
                                  updateChapter({ videoUrl: json.url });
                                  toast.success(`อัปโหลดคลิป "${file.name}" เรียบร้อยแล้ว`);
                                }
                              } catch (err) {
                                const msg = err instanceof Error ? err.message : "การเชื่อมต่อขัดข้อง";
                                toast.error(`เกิดข้อผิดพลาดในการอัปโหลดวิดีโอ: ${msg}`);
                                updateChapter({ videoUrl: "" });
                              } finally {
                                setUploadingVideo(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Video Preview Box */}
                    {(() => {
                      const parsed = parseVideoSource(currentChapter.videoUrl);
                      if (!parsed) return null;

                      return (
                        <div className="overflow-hidden rounded-xl border border-sky-100 bg-slate-950 text-white shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs">
                            <span className="font-semibold text-sky-300 flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                              ตัวอย่างคลิปวิดีโอ ({parsed.providerLabel})
                            </span>
                            <span className="rounded bg-sky-500/20 px-2 py-0.5 font-mono text-[11px] text-sky-200">
                              {parsed.embedUrl
                                ? "คลิปออนไลน์ (Streaming)"
                                : `เวลาปัจจุบัน: ${formatMmSs(previewCurrentSec)} (${Math.floor(previewCurrentSec)} วินาที)`}
                            </span>
                          </div>

                          <div className="p-2 bg-black">
                            {parsed.embedUrl ? (
                              <div className="relative aspect-video max-h-60 w-full overflow-hidden rounded-lg bg-black">
                                <iframe
                                  src={parsed.embedUrl}
                                  title="Video Preview"
                                  className="h-full w-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            ) : parsed.directUrl ? (
                              <video
                                ref={previewVideoRef}
                                src={parsed.directUrl}
                                controls
                                className="max-h-60 w-full rounded-lg bg-black mx-auto"
                                onTimeUpdate={(e) => setPreviewCurrentSec(Math.floor(e.currentTarget.currentTime))}
                              />
                            ) : null}
                          </div>

                          <div className="bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-400">
                            {parsed.embedUrl
                              ? "💡 สำหรับคลิปออนไลน์ สามารถระบุนาที:วินาทีที่ต้องการหยุดถามคำถามได้ที่รายการจุดพักด้านล่าง"
                              : "💡 เลื่อนแถบเวลาวิดีโอไปยังตำแหน่งที่ต้องการ แล้วกดปุ่ม \"+ เพิ่มจุดพักถามคำถาม\" ด้านล่างเพื่อดึงเวลาอัตโนมัติ"}
                          </div>
                        </div>
                      );
                    })()}

                    {/* In-Video Checkpoints Header */}
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                            <span>⏸ จุดพักถามคำถามระหว่างดูคลิป</span>
                            <span className="rounded-full bg-sky-100 text-sky-800 text-[11px] font-semibold px-2 py-0.5">
                              {(currentChapter.videoCheckpoints ?? []).length} จุด
                            </span>
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            เมื่อดูคลิปถึงเวลาที่กำหนด วิดีโอจะหยุดพักเพื่อให้ตอบคำถาม และจะเล่นต่อเมื่อตอบถูก
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const existing = currentChapter.videoCheckpoints ?? [];
                            const defaultSec =
                              currentChapter.videoUrl && previewCurrentSec > 0
                                ? Math.floor(previewCurrentSec)
                                : (existing[existing.length - 1]?.timeSec ?? 0) + 10;
                            const nextCp: VideoCheckpoint = {
                              id: `cp-${Date.now()}`,
                              timeSec: defaultSec,
                              question: "คำถามทดสอบความเข้าใจระหว่างดูคลิป?",
                              choices: ["ตัวเลือกที่ 1 (คำตอบที่ถูก)", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3"],
                              answerIndex: 0,
                              explanation: "คำอธิบายเพิ่มเติมเมื่อผู้เรียนตอบถูก",
                            };
                            updateChapter({
                              videoCheckpoints: [...existing, nextCp].sort((a, b) => a.timeSec - b.timeSec),
                            });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors shadow-2xs cursor-pointer"
                        >
                          <PlusIcon width={13} height={13} />
                          <span>เพิ่มจุดพัก {previewCurrentSec > 0 ? `(${formatMmSs(previewCurrentSec)})` : ""}</span>
                        </button>
                      </div>

                      {/* Checkpoints List */}
                      {(currentChapter.videoCheckpoints ?? []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                          <p className="text-xs text-slate-500">
                            ยังไม่มีจุดพักถามคำถาม — กดปุ่ม <strong className="text-sky-700 font-semibold">+ เพิ่มจุดพัก</strong> เพื่อกำหนดเวลาหยุดถามในคลิป
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(currentChapter.videoCheckpoints ?? []).map((cp, cpIdx) => {
                            const updateCp = (patch: Partial<VideoCheckpoint>) => {
                              const list = [...(currentChapter.videoCheckpoints ?? [])];
                              list[cpIdx] = { ...list[cpIdx], ...patch };
                              updateChapter({ videoCheckpoints: list });
                            };
                            const mins = Math.floor(cp.timeSec / 60);
                            const secs = cp.timeSec % 60;
                            return (
                              <div
                                key={cp.id}
                                className="rounded-xl border border-sky-100 bg-sky-50/25 p-3.5 space-y-3 shadow-2xs transition-all hover:border-sky-200 hover:bg-sky-50/40"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-2.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 border border-sky-200">
                                      ⏱ จุดพักที่ {cpIdx + 1} ({formatMmSs(cp.timeSec)})
                                    </span>
                                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs shadow-2xs">
                                      <span className="text-slate-400 text-[11px]">นาที:</span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={mins}
                                        onChange={(e) => {
                                          const m = Math.max(0, Number(e.target.value) || 0);
                                          updateCp({ timeSec: m * 60 + secs });
                                        }}
                                        className="h-6 w-10 text-center font-mono text-xs font-bold text-slate-800 focus:outline-none"
                                      />
                                      <span className="text-slate-400 font-bold">:</span>
                                      <span className="text-slate-400 text-[11px]">วินาที:</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={59}
                                        value={secs}
                                        onChange={(e) => {
                                          const s = Math.min(59, Math.max(0, Number(e.target.value) || 0));
                                          updateCp({ timeSec: mins * 60 + s });
                                        }}
                                        className="h-6 w-10 text-center font-mono text-xs font-bold text-slate-800 focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateChapter({
                                        videoCheckpoints: (currentChapter.videoCheckpoints ?? []).filter(
                                          (_, i) => i !== cpIdx,
                                        ),
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                    title="ลบจุดพักนี้"
                                  >
                                    <TrashIcon width={13} height={13} />
                                    <span>ลบจุดพัก</span>
                                  </button>
                                </div>

                                <Field htmlFor={`cp-q-${cp.id}`} label="คำถามที่แสดงเมื่อวิดีโอหยุดพัก">
                                  <Input
                                    id={`cp-q-${cp.id}`}
                                    value={cp.question}
                                    onChange={(e) => updateCp({ question: e.target.value })}
                                    className="bg-white"
                                  />
                                </Field>

                                <div className="space-y-1.5">
                                  <span className="block text-xs font-bold text-slate-700">
                                    ตัวเลือกคำตอบ (คลิกวงกลมหน้าข้อที่เป็นคำตอบที่ถูกต้อง)
                                  </span>
                                  {cp.choices.map((chText, cIdx) => (
                                    <div key={cIdx} className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`cp-ans-${cp.id}`}
                                        checked={cp.answerIndex === cIdx}
                                        onChange={() => updateCp({ answerIndex: cIdx })}
                                        className="h-4 w-4 accent-sky-600 cursor-pointer"
                                        title="ตั้งเป็นคำตอบที่ถูกต้อง"
                                      />
                                      <Input
                                        value={chText}
                                        onChange={(e) => {
                                          const nextChoices = [...cp.choices];
                                          nextChoices[cIdx] = e.target.value;
                                          updateCp({ choices: nextChoices });
                                        }}
                                        className="bg-white"
                                      />
                                    </div>
                                  ))}
                                </div>

                                <Field htmlFor={`cp-exp-${cp.id}`} label="เฉลย / คำอธิบายหลังตอบถูก">
                                  <Input
                                    id={`cp-exp-${cp.id}`}
                                    value={cp.explanation ?? ""}
                                    onChange={(e) => updateCp({ explanation: e.target.value })}
                                    className="bg-white"
                                  />
                                </Field>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Objectives as clean individual input rows */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text">
                      🎯 วัตถุประสงค์การเรียนรู้ประจำบท ({currentChapter.objectives.length} ข้อ)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChapter({
                          objectives: [...currentChapter.objectives, "วัตถุประสงค์ข้อใหม่..."],
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                    >
                      <PlusIcon width={13} height={13} />
                      เพิ่มวัตถุประสงค์
                    </button>
                  </div>

                  <div className="space-y-2">
                    {currentChapter.objectives.map((obj, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-xs font-bold text-primary">
                          {oIdx + 1}
                        </span>
                        <Input
                          value={obj}
                          onChange={(e) => {
                            const next = [...currentChapter.objectives];
                            next[oIdx] = e.target.value;
                            updateChapter({ objectives: next });
                          }}
                        />
                        {currentChapter.objectives.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateChapter({
                                objectives: currentChapter.objectives.filter((_, i) => i !== oIdx),
                              })
                            }
                            className="shrink-0 rounded-lg p-2 text-text-muted hover:bg-danger-soft hover:text-danger cursor-pointer"
                            title="ลบข้อนี้"
                          >
                            <TrashIcon width={15} height={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid items-start gap-4 pt-2 border-t border-border/60 sm:grid-cols-2">
                  <Field htmlFor="ed-instructor" label="ชื่อผู้สอน / วิทยากรประจำหลักสูตร">
                    <Input
                      id="ed-instructor"
                      value={instructor}
                      onChange={(e) => setInstructor(e.target.value)}
                    />
                  </Field>
                  <Field htmlFor="ed-audience" label="กลุ่มเป้าหมายผู้เรียน">
                    <Input
                      id="ed-audience"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: Lecture Articles (One focused sub-topic at a time, auto-sized!) */}
            {chapterSubTab === "articles" && currentArticle && (
              <div className="space-y-4 rounded-xl border border-border/80 bg-surface p-4 sm:p-5">
                {/* Article selector pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {currentChapter.articles.map((_, aIdx) => (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() => setSelectedArtIdx(aIdx)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                          aIdx === safeArtIdx
                            ? "bg-primary text-white"
                            : "bg-page text-text hover:bg-primary-soft/50"
                        }`}
                      >
                        หัวข้อย่อยที่ {aIdx + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const nextLen = currentChapter.articles.length;
                        updateChapter({
                          articles: [
                            ...currentChapter.articles,
                            {
                              heading: `${nextLen + 1}. หัวข้อเนื้อหาย่อยใหม่`,
                              paragraphs: ["รายละเอียดเนื้อหา..."],
                            },
                          ],
                        });
                        setSelectedArtIdx(nextLen);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary-soft/50 cursor-pointer"
                    >
                      <PlusIcon width={13} height={13} />
                      เพิ่มหัวข้อย่อย
                    </button>
                  </div>

                  {currentChapter.articles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        updateChapter({
                          articles: currentChapter.articles.filter((_, i) => i !== safeArtIdx),
                        });
                        setSelectedArtIdx((prev) => Math.max(0, prev - 1));
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger-soft cursor-pointer"
                    >
                      <TrashIcon width={14} height={14} />
                      ลบหัวข้อย่อยที่ {safeArtIdx + 1}
                    </button>
                  )}
                </div>

                <Field htmlFor="art-heading" label={`ชื่อหัวข้อย่อยที่ ${safeArtIdx + 1}`}>
                  <Input
                    id="art-heading"
                    value={currentArticle.heading}
                    onChange={(e) => {
                      const next = [...currentChapter.articles];
                      next[safeArtIdx] = { ...currentArticle, heading: e.target.value };
                      updateChapter({ articles: next });
                    }}
                    className="font-bold"
                  />
                </Field>

                {/* Each paragraph gets its own clean, auto-height box! */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text">
                      ย่อหน้าคำอธิบาย ({currentArticle.paragraphs.length} ย่อหน้า)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...currentChapter.articles];
                        next[safeArtIdx] = {
                          ...currentArticle,
                          paragraphs: [...currentArticle.paragraphs, "ย่อหน้าใหม่..."],
                        };
                        updateChapter({ articles: next });
                      }}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      + เพิ่มย่อหน้าใหม่
                    </button>
                  </div>

                  {currentArticle.paragraphs.map((pText, pIdx) => (
                    <div key={pIdx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>ย่อหน้าที่ {pIdx + 1}</span>
                        {currentArticle.paragraphs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...currentChapter.articles];
                              next[safeArtIdx] = {
                                ...currentArticle,
                                paragraphs: currentArticle.paragraphs.filter((_, i) => i !== pIdx),
                              };
                              updateChapter({ articles: next });
                            }}
                            className="text-danger hover:underline cursor-pointer"
                          >
                            ลบย่อหน้านี้
                          </button>
                        )}
                      </div>
                      <Textarea
                        rows={autoRows(pText, 3)}
                        value={pText}
                        onChange={(e) => {
                          const nextParas = [...currentArticle.paragraphs];
                          nextParas[pIdx] = e.target.value;
                          const next = [...currentChapter.articles];
                          next[safeArtIdx] = { ...currentArticle, paragraphs: nextParas };
                          updateChapter({ articles: next });
                        }}
                        className="leading-relaxed"
                      />
                    </div>
                  ))}
                </div>

                {/* Bullet points inside this article (if any, or allow adding) */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text">
                      รายการข้อย่อยประกอบ ({currentArticle.bullets?.length ?? 0} ข้อ)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...currentChapter.articles];
                        next[safeArtIdx] = {
                          ...currentArticle,
                          bullets: [...(currentArticle.bullets ?? []), "ข้อย่อยใหม่..."],
                        };
                        updateChapter({ articles: next });
                      }}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      + เพิ่มข้อย่อย
                    </button>
                  </div>

                  {(currentArticle.bullets ?? []).map((bText, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-page text-xs font-bold text-text-muted">
                        •
                      </span>
                      <Input
                        value={bText}
                        onChange={(e) => {
                          const nextBullets = [...(currentArticle.bullets ?? [])];
                          nextBullets[bIdx] = e.target.value;
                          const next = [...currentChapter.articles];
                          next[safeArtIdx] = { ...currentArticle, bullets: nextBullets };
                          updateChapter({ articles: next });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextBullets = (currentArticle.bullets ?? []).filter((_, i) => i !== bIdx);
                          const next = [...currentChapter.articles];
                          next[safeArtIdx] = { ...currentArticle, bullets: nextBullets };
                          updateChapter({ articles: next });
                        }}
                        className="shrink-0 rounded-lg p-2 text-text-muted hover:bg-danger-soft hover:text-danger cursor-pointer"
                        title="ลบข้อย่อยนี้"
                      >
                        <TrashIcon width={15} height={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-TAB 3: Guidelines, Case Study & Takeaway */}
            {chapterSubTab === "case" && (
              <div className="space-y-4 rounded-xl border border-border/80 bg-surface p-4 sm:p-5">
                {/* Guidelines as individual rows */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text">
                      📋 แนวทางปฏิบัติสำหรับผู้ปฏิบัติงาน ({currentChapter.guidelines.length} ข้อ)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChapter({
                          guidelines: [...currentChapter.guidelines, "แนวทางปฏิบัติข้อใหม่..."],
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                    >
                      <PlusIcon width={13} height={13} />
                      เพิ่มแนวทางปฏิบัติ
                    </button>
                  </div>

                  <div className="space-y-2">
                    {currentChapter.guidelines.map((g, gIdx) => (
                      <div key={gIdx} className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                          ✓
                        </span>
                        <Input
                          value={g}
                          onChange={(e) => {
                            const next = [...currentChapter.guidelines];
                            next[gIdx] = e.target.value;
                            updateChapter({ guidelines: next });
                          }}
                        />
                        {currentChapter.guidelines.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateChapter({
                                guidelines: currentChapter.guidelines.filter((_, i) => i !== gIdx),
                              })
                            }
                            className="shrink-0 rounded-lg p-2 text-text-muted hover:bg-danger-soft hover:text-danger cursor-pointer"
                          >
                            <TrashIcon width={15} height={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-3 border-t border-border/60">
                  <Field htmlFor="ch-case" label="💡 สถานการณ์ตัวอย่างหน้างานจริง (Case Study)">
                    <Textarea
                      id="ch-case"
                      rows={autoRows(currentChapter.caseStudy.scenario, 2)}
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
                        rows={autoRows(currentChapter.caseStudy.goodPractice, 3)}
                        value={currentChapter.caseStudy.goodPractice}
                        onChange={(e) =>
                          updateChapter({
                            caseStudy: { ...currentChapter.caseStudy, goodPractice: e.target.value },
                          })
                        }
                        className="border-success/50"
                      />
                    </Field>
                    <Field htmlFor="ch-bad" label="✗ ข้อบกพร่องที่ห้ามปฏิบัติ">
                      <Textarea
                        id="ch-bad"
                        rows={autoRows(currentChapter.caseStudy.badPractice, 3)}
                        value={currentChapter.caseStudy.badPractice}
                        onChange={(e) =>
                          updateChapter({
                            caseStudy: { ...currentChapter.caseStudy, badPractice: e.target.value },
                          })
                        }
                        className="border-danger/50"
                      />
                    </Field>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60">
                  <Field htmlFor="ch-takeaway" label="☑️ ข้อความติ๊กยืนยันความเข้าใจท้ายบทเรียน">
                    <Input
                      id="ch-takeaway"
                      value={currentChapter.takeaway}
                      onChange={(e) => updateChapter({ takeaway: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXAM QUESTIONS TAB: Question Number Bar + Single Spacious Question Editor */}
        {tab === "questions" && currentQuestion && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-page/50 p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {questions.map((_, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => setSelectedQIdx(qIdx)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      qIdx === safeQIdx
                        ? "bg-primary text-white shadow-2xs"
                        : "bg-surface border border-border text-text hover:border-primary/40"
                    }`}
                  >
                    ข้อ {qIdx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary bg-surface px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary-soft/50 cursor-pointer"
                >
                  <PlusIcon width={14} height={14} />
                  เพิ่มข้อสอบใหม่
                </button>
              </div>

              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(safeQIdx)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft cursor-pointer"
                >
                  <TrashIcon width={14} height={14} />
                  ลบข้อที่ {safeQIdx + 1}
                </button>
              )}
            </div>

            <div className="rounded-xl border border-border/80 bg-surface p-4 sm:p-5 space-y-4">
              <Field htmlFor="q-title" label={`โจทย์คำถามข้อที่ ${safeQIdx + 1}`}>
                <Textarea
                  id="q-title"
                  rows={2}
                  value={currentQuestion.question}
                  onChange={(e) => {
                    const next = [...questions];
                    next[safeQIdx] = { ...currentQuestion, question: e.target.value };
                    setQuestions(next);
                  }}
                  className="font-bold"
                />
              </Field>

              <div className="space-y-2.5">
                <span className="block text-sm font-bold text-text">
                  ตัวเลือกคำตอบ (คลิกวงกลมหน้าข้อที่เป็น <span className="text-success">คำตอบที่ถูกต้อง</span>)
                </span>
                <div className="space-y-2">
                  {currentQuestion.choices.map((ch, cIdx) => {
                    const isCorrect = currentQuestion.answerIndex === cIdx;
                    return (
                      <div
                        key={cIdx}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                          isCorrect ? "border-success bg-success-soft/30" : "border-border/80 bg-page/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`ans-${safeQIdx}`}
                          checked={isCorrect}
                          onChange={() => {
                            const next = [...questions];
                            next[safeQIdx] = { ...currentQuestion, answerIndex: cIdx };
                            setQuestions(next);
                          }}
                          className="h-4 w-4 shrink-0 accent-success cursor-pointer"
                        />
                        <span className="w-20 shrink-0 text-xs font-bold text-text-muted">
                          {isCorrect ? "✓ เฉลย" : `ตัวเลือก ${cIdx + 1}`}
                        </span>
                        <Input
                          value={ch}
                          onChange={(e) => {
                            const nextChoices = [...currentQuestion.choices];
                            nextChoices[cIdx] = e.target.value;
                            const next = [...questions];
                            next[safeQIdx] = { ...currentQuestion, choices: nextChoices };
                            setQuestions(next);
                          }}
                          className="bg-surface"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <Field htmlFor="q-exp" label="💡 คำอธิบายเฉลย (แสดงให้ผู้เรียนเห็นหลังส่งกระดาษคำตอบ)">
                <Textarea
                  id="q-exp"
                  rows={2}
                  value={currentQuestion.explanation}
                  onChange={(e) => {
                    const next = [...questions];
                    next[safeQIdx] = { ...currentQuestion, explanation: e.target.value };
                    setQuestions(next);
                  }}
                />
              </Field>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
