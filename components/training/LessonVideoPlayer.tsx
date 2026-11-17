"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LessonChapter, VideoCheckpoint } from "@/data/elearningCurriculum";
import { cn } from "@/lib/cn";
import { parseVideoSource } from "./videoUtils";

export function formatMmSs(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type VideoScene = {
  title: string;
  subtitle: string;
  points: string[];
  narration: string;
  badge: string;
};

export const VIDEO_QUALITY_OPTIONS = [
  { id: "720p", label: "720p (ความคมชัดสูงสุด / HD)", ytQuality: "hd720" },
  { id: "480p", label: "480p (มาตรฐาน)", ytQuality: "large" },
  { id: "360p", label: "360p (ประหยัดข้อมูล)", ytQuality: "medium" },
  { id: "240p", label: "240p (ความคมชัดขั้นต่ำ)", ytQuality: "small" },
] as const;
export type VideoQualityOption = (typeof VIDEO_QUALITY_OPTIONS)[number]["id"];

export type ChapterQuizCompletionResult = {
  passed: boolean;
  correctCount: number;
  totalCount: number;
  checkpointResults: Record<string, { choice: number; isCorrect: boolean }>;
};

export function LessonVideoPlayer({
  courseCode,
  instructor,
  chapter,
  chapterIndex,
  totalChapters,
  onVideoCompleted,
}: {
  courseCode: string;
  instructor: string;
  chapter: LessonChapter;
  chapterIndex: number;
  totalChapters: number;
  onVideoCompleted?: (result?: ChapterQuizCompletionResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const scenes = useMemo<VideoScene[]>(() => {
    const list: VideoScene[] = [];
    list.push({
      badge: `บทนำ · ${chapter.clauseRef}`,
      title: chapter.title,
      subtitle: "วัตถุประสงค์การเรียนรู้ประจำบท",
      points: chapter.objectives,
      narration: `ยินดีต้อนรับสู่ ${chapter.title} โดย ${instructor} ในบทนี้เราจะเรียนรู้วัตถุประสงค์หลักทั้ง ${chapter.objectives.length} ข้อ ตามมาตรฐาน ${chapter.clauseRef}`,
    });

    for (const art of chapter.articles) {
      const pts =
        art.bullets && art.bullets.length > 0
          ? art.bullets
          : art.table
            ? art.table.rows.map((r) => `${r[0]} — ${r.slice(1).join(" · ")}`)
            : art.paragraphs;
      list.push({
        badge: `เนื้อหาหลัก · ${chapter.clauseRef}`,
        title: art.heading,
        subtitle: art.paragraphs[0] ?? chapter.title,
        points: pts.slice(0, 5),
        narration: art.paragraphs.join(" "),
      });
    }

    list.push({
      badge: "กรณีศึกษาหน้างานจริง (Case Study)",
      title: "ตัวอย่างสถานการณ์และแนวทางปฏิบัติที่ถูกต้อง",
      subtitle: `สถานการณ์: ${chapter.caseStudy.scenario}`,
      points: [
        `✓ แนวทางที่ถูกต้อง: ${chapter.caseStudy.goodPractice}`,
        `✗ ข้อห้ามปฏิบัติ: ${chapter.caseStudy.badPractice}`,
        ...chapter.guidelines.slice(0, 2).map((g) => `• ${g}`),
      ],
      narration: `กรณีศึกษาหน้างาน: ${chapter.caseStudy.scenario} แนวทางที่ถูกต้องตามมาตรฐาน ISO คือ ${chapter.caseStudy.goodPractice}`,
    });

    return list;
  }, [chapter, instructor]);

  // Synthesize default checkpoints if none exist on the chapter yet
  const checkpoints = useMemo<VideoCheckpoint[]>(() => {
    if (chapter.videoCheckpoints && chapter.videoCheckpoints.length > 0) {
      return [...chapter.videoCheckpoints].sort((a, b) => a.timeSec - b.timeSec);
    }
    return [
      {
        id: `auto-cp-${chapter.id}-1`,
        timeSec: 10,
        question: `ข้อใดคือแนวทางปฏิบัติที่ถูกต้องจากกรณีศึกษาของ ${chapter.title.replace(/^บทที่\s*\d+\s*:\s*/, "")}?`,
        choices: [
          chapter.caseStudy.goodPractice,
          chapter.caseStudy.badPractice,
          "ข้ามขั้นตอนการตรวจสอบเพื่อประหยัดเวลา",
        ],
        answerIndex: 0,
        explanation: chapter.caseStudy.goodPractice,
      },
    ];
  }, [chapter]);

  const videoSource = useMemo(() => {
    return parseVideoSource(chapter.videoUrl);
  }, [chapter.videoUrl]);

  const isEmbedVideo = Boolean(videoSource?.embedUrl);
  const isDirectVideo = Boolean(videoSource?.directUrl);
  const isSimulated = !videoSource;

  // Built-in player total duration in seconds (default 30 sec simulated clip so checkpoints at 10s/20s trigger smoothly)
  const simulatedTotalSec = useMemo(() => {
    const maxCp = checkpoints.reduce((m, c) => Math.max(m, c.timeSec), 0);
    return Math.max(30, maxCp + 10);
  }, [checkpoints]);

  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [videoDuration, setVideoDuration] = useState(simulatedTotalSec);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState<VideoQualityOption>("720p");
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [qualityToast, setQualityToast] = useState<string | null>(null);
  const qualityToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxWatchedSecRef = useRef<number>(0);

  // Synchronize playbackRate to standard 1.0x & bound quality between 240p and 720p
  useEffect(() => {
    if (videoRef.current) {
      try {
        videoRef.current.defaultPlaybackRate = 1;
        videoRef.current.playbackRate = 1;
      } catch {}
    }
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "setPlaybackQualityRange", args: ["small", "hd720"] }),
          "*",
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd720"] }),
          "*",
        );
      } catch {}
    }
  }, []);

  const applyQuality = (q: VideoQualityOption) => {
    setQuality(q);
    setShowQualityMenu(false);
    const opt = VIDEO_QUALITY_OPTIONS.find((o) => o.id === q);
    if (iframeRef.current?.contentWindow && opt) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "setPlaybackQuality", args: [opt.ytQuality] }),
          "*",
        );
      } catch {}
    }
    if (qualityToastTimerRef.current) clearTimeout(qualityToastTimerRef.current);
    setQualityToast(`ความคมชัด: ${q}`);
    qualityToastTimerRef.current = setTimeout(() => {
      setQualityToast(null);
    }, 1400);
  };

  // Close quality menu on outside click
  useEffect(() => {
    if (!showQualityMenu) return;
    const close = () => setShowQualityMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [showQualityMenu]);

  useEffect(() => {
    setVideoLoadError(false);
  }, [chapter.videoUrl]);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);

  // Checkpoint quiz state
  const [passedCheckpoints, setPassedCheckpoints] = useState<Set<string>>(new Set());
  const [answeredCheckpointIds, setAnsweredCheckpointIds] = useState<Set<string>>(new Set());
  const [checkpointResults, setCheckpointResults] = useState<
    Record<string, { choice: number; isCorrect: boolean }>
  >({});
  const [activeCheckpoint, setActiveCheckpoint] = useState<VideoCheckpoint | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  const totalCheckpointsCount = checkpoints.length;
  const correctCheckpointsCount = useMemo(() => {
    return Object.values(checkpointResults).filter((r) => r.isCorrect).length;
  }, [checkpointResults]);
  const isChapterQuizPassed = totalCheckpointsCount === 0 || correctCheckpointsCount === totalCheckpointsCount;

  const effectiveDuration = isDirectVideo ? Math.max(1, videoDuration) : simulatedTotalSec;

  const handleVideoCompleted = () => {
    setPlaying(false);
    const passed = totalCheckpointsCount === 0 || correctCheckpointsCount === totalCheckpointsCount;
    onVideoCompleted?.({
      passed,
      correctCount: correctCheckpointsCount,
      totalCount: totalCheckpointsCount,
      checkpointResults,
    });
  };

  // Trigger checkpoint when currentSec reaches a checkpoint's timeSec
  const checkAndTriggerCheckpoint = (nextSec: number) => {
    const due = checkpoints.find(
      (cp) => !answeredCheckpointIds.has(cp.id) && nextSec >= cp.timeSec && currentSec < cp.timeSec + 2,
    );
    if (due) {
      setPlaying(false);
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      setActiveCheckpoint(due);
      setSelectedChoice(null);
      return true;
    }
    return false;
  };

  // Timer for built-in interactive video player (and YouTube fallback timer)
  useEffect(() => {
    if (!playing || isDirectVideo || activeCheckpoint) return;
    const interval = setInterval(() => {
      setCurrentSec((prev) => {
        const next = prev + 0.5;
        maxWatchedSecRef.current = Math.max(maxWatchedSecRef.current, next);
        const hit = checkpoints.find(
          (cp) => !answeredCheckpointIds.has(cp.id) && prev < cp.timeSec && next >= cp.timeSec,
        );
        if (hit) {
          setPlaying(false);
          setActiveCheckpoint(hit);
          setSelectedChoice(null);
          return hit.timeSec;
        }
        if (next >= simulatedTotalSec) {
          handleVideoCompleted();
          return simulatedTotalSec;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [playing, isDirectVideo, activeCheckpoint, checkpoints, answeredCheckpointIds, simulatedTotalSec, correctCheckpointsCount, totalCheckpointsCount, checkpointResults]);

  const handleSaveAndResume = () => {
    if (!activeCheckpoint || selectedChoice === null) return;
    const isCorrect = selectedChoice === activeCheckpoint.answerIndex;

    // Record this checkpoint answer silently — do not spoil correct/wrong during video
    setCheckpointResults((prev) => ({
      ...prev,
      [activeCheckpoint.id]: { choice: selectedChoice, isCorrect },
    }));

    setAnsweredCheckpointIds((prev) => {
      const next = new Set(prev);
      next.add(activeCheckpoint.id);
      return next;
    });

    if (isCorrect) {
      setPassedCheckpoints((prev) => {
        const next = new Set(prev);
        next.add(activeCheckpoint.id);
        return next;
      });
    }

    setActiveCheckpoint(null);
    setSelectedChoice(null);
    if (isDirectVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    setPlaying(true);
  };

  const overallPct = Math.min(100, Math.round((currentSec / effectiveDuration) * 100));
  const safeSceneIdx = Math.min(
    scenes.length - 1,
    Math.floor((currentSec / effectiveDuration) * scenes.length),
  );
  const currentScene = scenes[safeSceneIdx] ?? scenes[0];

  const replayFromStart = () => {
    setCurrentSec(0);
    maxWatchedSecRef.current = 0;
    if (isDirectVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    setPlaying(true);
  };

  const togglePlayPause = () => {
    if (activeCheckpoint) return;
    if (!playing && currentSec >= effectiveDuration) {
      replayFromStart();
      return;
    }
    if (isDirectVideo && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    } else {
      setPlaying((p) => !p);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    } else {
      setMuted(!muted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="space-y-3">
      {/* Main Video Container with In-Video Quiz Overlay */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-slate-800 shadow-md"
      >
        {/* On-screen Quality Toast Notification */}
        {qualityToast && (
          <div className="pointer-events-none absolute top-4 right-4 z-30 flex items-center gap-2 rounded-xl bg-slate-950/85 border border-sky-400/50 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md transition-all">
            <span className="text-sky-400">⚙️</span>
            <span>{qualityToast}</span>
          </div>
        )}
        {isDirectVideo && videoSource?.directUrl ? (
          <div
            onClick={togglePlayPause}
            className="relative aspect-video w-full bg-black cursor-pointer group select-none flex items-center justify-center"
          >
            <video
              ref={videoRef}
              src={videoSource.directUrl}
              playsInline
              controls={false}
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              className="h-full w-full object-contain pointer-events-none select-none no-native-controls"
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (Number.isFinite(dur) && dur > 0) setVideoDuration(dur);
                setVideoLoadError(false);
                try {
                  e.currentTarget.defaultPlaybackRate = 1;
                  e.currentTarget.playbackRate = 1;
                } catch {}
              }}
              onPlay={() => {
                setPlaying(true);
                if (videoRef.current) {
                  try {
                    videoRef.current.defaultPlaybackRate = 1;
                    videoRef.current.playbackRate = 1;
                  } catch {}
                }
              }}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => {
                const t = e.currentTarget.currentTime;
                setCurrentSec(t);
                maxWatchedSecRef.current = Math.max(maxWatchedSecRef.current, t);
                checkAndTriggerCheckpoint(t);
              }}
              onSeeking={(e) => {
                // Prevent skipping/fast-forwarding ahead
                const target = e.currentTarget.currentTime;
                if (target > maxWatchedSecRef.current + 1) {
                  e.currentTarget.currentTime = maxWatchedSecRef.current;
                  setCurrentSec(maxWatchedSecRef.current);
                }
              }}
              onEnded={() => {
                handleVideoCompleted();
              }}
              onError={() => {
                setVideoLoadError(true);
              }}
            />

            {/* Centered Play Button Overlay when paused — Clean Glassmorphism White & Sky Blue */}
            {!playing && !activeCheckpoint && !videoLoadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[0.5px] transition-opacity">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-sky-600 shadow-xl border border-sky-100/60 hover:scale-110 hover:bg-sky-50 transition-all">
                  <span className="text-2xl ml-1 text-sky-600">▶</span>
                </div>
              </div>
            )}
            {videoLoadError && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-4 text-center text-white"
              >
                <p className="text-sm font-bold text-amber-300">⚠️ ไม่สามารถโหลดวิดีโอนี้ในเบราว์เซอร์ได้โดยตรง</p>
                <p className="mt-1 text-xs text-slate-300">
                  ไฟล์อาจถูกจำกัดสิทธิ์ หรือเบราว์เซอร์ไม่รองรับ Codec ของไฟล์นี้
                </p>
                <a
                  href={videoSource.directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition-colors"
                >
                  เปิดไฟล์วิดีโอในแท็บใหม่ ↗
                </a>
              </div>
            )}
          </div>
        ) : isEmbedVideo && videoSource?.embedUrl ? (
          <div className="relative aspect-video w-full bg-black">
            <iframe
              ref={iframeRef}
              src={videoSource.embedUrl}
              title={chapter.title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          /* Built-in Interactive ISO Training Video Player */
          <div className="relative flex min-h-[340px] sm:aspect-video w-full flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-4 sm:p-6 select-none">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-400/30 px-2.5 py-0.5 font-bold text-sky-300">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      playing ? "bg-emerald-400 animate-pulse" : "bg-amber-400",
                    )}
                  />
                  {courseCode} · บทที่ {chapterIndex + 1}/{totalChapters}
                </span>
                <span className="hidden sm:inline rounded bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                  {currentScene.badge}
                </span>
              </div>
              <span className="rounded bg-black/40 px-2.5 py-0.5 font-mono text-[11px] text-amber-300 tabular-nums">
                คำถามระหว่างคลิป: {passedCheckpoints.size}/{checkpoints.length} ข้อ
              </span>
            </div>

            <div
              onClick={() => {
                if (activeCheckpoint) return;
                if (!playing && currentSec >= effectiveDuration) {
                  setCurrentSec(0);
                }
                setPlaying((p) => !p);
              }}
              className="my-auto py-4 cursor-pointer"
            >
              <div className="mx-auto max-w-2xl space-y-3">
                <h3 className="text-base sm:text-xl font-extrabold leading-snug text-white">
                  {currentScene.title}
                </h3>
                <p className="text-xs sm:text-sm text-sky-200/90 leading-relaxed line-clamp-2">
                  {currentScene.subtitle}
                </p>

                <ul className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 text-xs sm:text-sm text-slate-100 backdrop-blur-xs">
                  {currentScene.points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 leading-relaxed">
                      <span className="mt-0.5 text-sky-400 font-bold">▸</span>
                      <span className="line-clamp-2">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {!playing && !activeCheckpoint && (
                <div className="mt-3 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-sky-400 transition-colors">
                    <span>▶</span>
                    <span>
                      {currentSec >= effectiveDuration
                        ? "เล่นวิดีโอซ้ำอีกครั้ง"
                        : currentSec > 0
                          ? "เล่นวิดีโอต่อ"
                          : "คลิกเพื่อเริ่มเล่นวิดีโอ"}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {showCaptions && (
              <div className="rounded-lg bg-black/75 px-3 py-2 text-center text-xs text-amber-200 leading-relaxed">
                🎙️ <span className="font-semibold text-white">{instructor.split(" ")[0]}:</span>{" "}
                &ldquo;{currentScene.narration}&rdquo;
              </div>
            )}
          </div>
        )}

        {/* IN-VIDEO POP-UP QUIZ OVERLAY: Silent recording & immediate resume upon answering */}
        {activeCheckpoint && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl rounded-2xl border border-sky-400/40 bg-slate-900 p-4 sm:p-5 text-white shadow-2xl space-y-3.5 max-h-full overflow-y-auto">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-400/40 px-3 py-0.5 text-xs font-bold text-sky-300">
                  ⏸ คำถามคั่นระหว่างดูวิดีโอ (นาทีที่ {formatMmSs(activeCheckpoint.timeSec)})
                </span>
                <span className="text-[11px] text-slate-400">
                  เลือกคำตอบเพื่อบันทึกและดูวิดีโอต่อ
                </span>
              </div>

              <p className="text-sm sm:text-base font-extrabold leading-snug text-white">
                ❓ {activeCheckpoint.question}
              </p>

              <div className="space-y-2">
                {activeCheckpoint.choices.map((choice, cIdx) => {
                  const isSelected = selectedChoice === cIdx;
                  return (
                    <label
                      key={cIdx}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors",
                        isSelected
                          ? "border-sky-400 bg-sky-500/20 font-semibold text-sky-200 ring-1 ring-sky-400/40"
                          : "border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800",
                      )}
                    >
                      <input
                        type="radio"
                        name={`cp-${activeCheckpoint.id}`}
                        checked={isSelected}
                        onChange={() => setSelectedChoice(cIdx)}
                        className="mt-0.5 accent-sky-400"
                      />
                      <span>{choice}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={selectedChoice === null}
                  onClick={handleSaveAndResume}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs sm:text-sm font-extrabold text-white hover:bg-sky-400 disabled:opacity-40 transition-colors cursor-pointer shadow-md"
                >
                  บันทึกคำตอบและดูต่อ ▶
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Bar with Checkpoint Dots — Sits directly on the video bottom ("เส้นด้านบน") */}
        <div className="relative h-2 w-full bg-slate-900/90 overflow-visible select-none border-b border-slate-800/60">
          <div
            className="h-full bg-sky-500 transition-all duration-150"
            style={{ width: `${overallPct}%` }}
          />
          {checkpoints.map((cp) => {
            const leftPct = Math.min(98, Math.max(2, (cp.timeSec / effectiveDuration) * 100));
            const isAnswered = answeredCheckpointIds.has(cp.id);
            return (
              <div
                key={cp.id}
                style={{ left: `${leftPct}%` }}
                title={`จุดพักตอบคำถาม: นาทีที่ ${formatMmSs(cp.timeSec)} (${
                  !isAnswered ? "ยังไม่ถึงจุดนี้" : "ตอบคำถามแล้ว"
                })`}
                className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow-md text-[9px] font-black",
                    !isAnswered
                      ? "bg-amber-400 text-slate-950 ring-1 ring-amber-500/50"
                      : "bg-sky-500 text-white ring-1 ring-sky-300",
                  )}
                >
                  {!isAnswered ? "?" : "●"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Player Controls — Single Clean Row without duplicate line below ("เอาเส้นด้านล่างออก") */}
        <div className="bg-white px-4 py-2.5 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            {!isEmbedVideo && (
              <button
                type="button"
                onClick={togglePlayPause}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 font-bold text-white hover:bg-sky-700 transition-colors cursor-pointer shadow-2xs"
              >
                <span>{playing ? "⏸ หยุดชั่วคราว" : "▶ เล่นวิดีโอ"}</span>
              </button>
            )}

            {isDirectVideo && (
              <button
                type="button"
                onClick={toggleMute}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
                title={muted ? "เปิดเสียง" : "ปิดเสียง"}
              >
                <span>{muted ? "🔇 ปิดเสียง" : "🔊 เปิดเสียง"}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-mono text-xs text-slate-600 font-semibold tabular-nums">
              {formatMmSs(currentSec)} / {formatMmSs(effectiveDuration)}
            </span>

            {/* Quality Selector Popover (240p - 720p) */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQualityMenu((v) => !v);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs",
                  showQualityMenu
                    ? "border-sky-300 bg-sky-50 text-sky-700 font-extrabold ring-1 ring-sky-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
                )}
                title="ปรับความละเอียดคลิป (ขั้นต่ำ 240p - สูงสุด 720p)"
              >
                <span>⚙️ {quality}</span>
                <span className="text-[9px] text-slate-400">▼</span>
              </button>

              {showQualityMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-2 z-40 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2.5 py-1 text-[11px] font-bold text-slate-500 border-b border-slate-100 mb-1 flex items-center justify-between">
                    <span>ความละเอียดวิดีโอ</span>
                    <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.2 rounded font-mono font-bold">240p - 720p</span>
                  </div>
                  <div className="space-y-0.5">
                    {VIDEO_QUALITY_OPTIONS.map((opt) => {
                      const isSelected = quality === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => applyQuality(opt.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors text-left cursor-pointer",
                            isSelected
                              ? "bg-sky-50 text-sky-700 font-bold"
                              : "text-slate-700 hover:bg-slate-100",
                          )}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <span className="text-sky-600 font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
              title="ขยายเต็มหน้าจอ"
            >
              ⛶ เต็มจอ
            </button>

            {isSimulated && (
              <button
                type="button"
                onClick={() => setShowCaptions((c) => !c)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs",
                  showCaptions
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                CC คำบรรยาย
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Handout / Transcript */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-page/70 px-3.5 py-2 text-xs">
        <span className="text-text-muted">
          💡 วิดีโอจะหยุดพักอัตโนมัติเมื่อถึงจุด <strong>?</strong> บนแถบเวลา เพื่อถามคำถามและเล่นต่อเมื่อตอบถูก
        </span>
        <button
          type="button"
          onClick={() => setShowTranscript((v) => !v)}
          className="font-semibold text-primary hover:underline cursor-pointer shrink-0"
        >
          {showTranscript ? "▾ ซ่อนเอกสารสรุป" : "📄 ดูเอกสารสรุปประกอบวิดีโอ"}
        </button>
      </div>

      {showTranscript && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4 text-xs sm:text-sm">
          <p className="font-bold text-text">📄 เอกสารสรุปประกอบวิดีโอ (Handout & Case Study)</p>
          {chapter.articles.map((art, aIdx) => (
            <div key={aIdx} className="space-y-1 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
              <p className="font-bold text-primary">{art.heading}</p>
              {art.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-text leading-relaxed">
                  {p}
                </p>
              ))}
              {art.bullets && art.bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 text-text-muted">
                  {art.bullets.map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
