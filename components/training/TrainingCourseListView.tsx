"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  PageHeader,
  useToast,
  type Column,
} from "@/components/ui";
import { StatTile } from "@/components/dashboard/StatTile";
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { deleteTrainingCourse } from "@/lib/training/courseActions";
import type { TrainingCourseView } from "@/lib/training/courseQueries";
import { TrainingCourseModal } from "./TrainingCourseModal";

export function TrainingCourseListView({
  courses,
  standards,
  nextCode,
}: {
  courses: TrainingCourseView[];
  standards: { id: string; label: string }[];
  nextCode: string;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const role = useSessionUser().role;
  const canManage = role === "admin" || role === "qe";

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [standardFilter, setStandardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [modalCourse, setModalCourse] = useState<TrainingCourseView | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<TrainingCourseView | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return courses.filter((c) => {
      if (standardFilter !== "all" && c.standardId !== standardFilter) return false;
      if (statusFilter === "active" && !c.active) return false;
      if (statusFilter === "inactive" && c.active) return false;
      if (!q) return true;
      const text = `${c.code} ${c.name} ${c.description ?? ""} ${c.standardLabel}`.toLowerCase();
      return text.includes(q);
    });
  }, [courses, standardFilter, statusFilter, deferredSearch]);

  const activeCount = courses.filter((c) => c.active).length;
  const inactiveCount = courses.length - activeCount;
  const totalAttendees = courses.reduce((sum, c) => sum + c.attendeeCount, 0);

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteTrainingCourse(deleting.id);
      setDeleting(null);
      if (!res.ok) {
        if (res.error) toast.error(t.errors[res.error]);
        return;
      }
      toast.success("ลบหลักสูตรการอบรมแล้ว");
    });
  }

  const columns: Column<TrainingCourseView>[] = [
    {
      key: "course",
      header: "รหัส / ชื่อหลักสูตร",
      render: (c) => (
        <div className="min-w-[220px] lg:min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-primary">{c.code}</span>
            {c.standardId && <Badge tone="purple">{c.standardLabel}</Badge>}
          </div>
          <p className="mt-0.5 font-semibold text-text">{c.name}</p>
          {c.description && <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{c.description}</p>}
        </div>
      ),
    },
    {
      key: "duration",
      header: "ระยะเวลา / อายุใบรับรอง",
      render: (c) => (
        <div className="whitespace-nowrap text-xs text-text-muted">
          <p>{c.durationHours ? `${c.durationHours} ชั่วโมง` : "–"}</p>
          <p>{c.validityMonths ? `ต่ออายุทุก ${c.validityMonths} เดือน` : "ไม่มีวันหมดอายุ"}</p>
        </div>
      ),
    },
    {
      key: "attendees",
      header: "ผู้เข้าอบรม",
      render: (c) => (
        <div className="whitespace-nowrap text-xs">
          <span className="font-bold tabular-nums text-text">{c.attendeeCount} คน</span>
          {c.attendeeCount > 0 && (
            <p className="text-text-muted">อบรมแล้ว {c.completedCount} คน</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (c) => (
        <Badge tone={c.active ? "success" : "neutral"}>
          {c.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Link
            href="/training"
            className="rounded-control border border-border/80 bg-surface px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-primary hover:border-primary/40 hover:bg-primary-soft transition-colors"
          >
            ดูรายชื่ออบรม
          </Link>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setModalCourse(c)}
                className="rounded-control p-1.5 text-text-muted hover:bg-page hover:text-primary cursor-pointer"
                title={t.common.edit}
                aria-label={`${t.common.edit} ${c.code}`}
              >
                <EditIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(c)}
                className="rounded-control p-1.5 text-text-muted hover:bg-page hover:text-danger cursor-pointer"
                title={t.common.delete}
                aria-label={`${t.common.delete} ${c.code}`}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.trainingCourses}
        description={t.pages.trainingCourses}
        actions={
          canManage && (
            <Button onClick={() => setModalCourse(null)}>
              <PlusIcon className="h-4 w-4" />
              เพิ่มหลักสูตร
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="หลักสูตรทั้งหมด" value={String(courses.length)} icon="📚" />
        <StatTile label="เปิดใช้งาน" value={String(activeCount)} accent="success" icon="✓" />
        <StatTile label="ปิดใช้งาน" value={String(inactiveCount)} accent="neutral" icon="–" />
        <StatTile label="ผู้เข้าอบรมสะสม" value={`${totalAttendees} คน`} accent="primary" icon="👥" />
      </div>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5">
          <label className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหารหัสหลักสูตร, ชื่อหลักสูตร, มาตรฐาน..."
              className="h-9 w-full rounded-lg border border-border/80 bg-surface pl-9 pr-3 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden"
            />
          </label>

          <select
            aria-label={t.requirements.standard}
            value={standardFilter}
            onChange={(e) => setStandardFilter(e.target.value)}
            className="h-9 rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text cursor-pointer"
          >
            <option value="all">ทุกมาตรฐาน ISO</option>
            {standards.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            aria-label="สถานะ"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="h-9 rounded-lg border border-border/80 bg-surface px-3 text-xs font-semibold text-text cursor-pointer"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="active">เปิดใช้งาน</option>
            <option value="inactive">ปิดใช้งาน</option>
          </select>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(c) => c.id}
          emptyTitle="ไม่พบหลักสูตรการอบรม"
        />
      </Card>

      <TrainingCourseModal
        open={modalCourse !== undefined}
        course={modalCourse ?? null}
        standards={standards}
        nextCode={nextCode}
        onClose={() => setModalCourse(undefined)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="ลบหลักสูตรการอบรม"
        message={deleting ? `ต้องการลบหลักสูตร "${deleting.code} ${deleting.name}" หรือไม่?` : ""}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
