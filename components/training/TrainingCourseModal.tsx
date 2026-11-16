"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { saveTrainingCourse, type CourseFieldError } from "@/lib/training/courseActions";
import type { TrainingCourseView } from "@/lib/training/courseQueries";

export function TrainingCourseModal({
  open,
  course,
  standards,
  nextCode,
  onClose,
}: {
  open: boolean;
  course: TrainingCourseView | null;
  standards: { id: string; label: string }[];
  nextCode: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <TrainingCourseModalInner
      key={course?.id ?? "new"}
      course={course}
      standards={standards}
      nextCode={nextCode}
      onClose={onClose}
    />
  );
}

function TrainingCourseModalInner({
  course,
  standards,
  nextCode,
  onClose,
}: {
  course: TrainingCourseView | null;
  standards: { id: string; label: string }[];
  nextCode: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [code, setCode] = useState(course?.code ?? nextCode);
  const [name, setName] = useState(course?.name ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [standardId, setStandardId] = useState(course?.standardId ?? "");
  const [durationHours, setDurationHours] = useState(
    course?.durationHours !== undefined ? String(course.durationHours) : "",
  );
  const [validityMonths, setValidityMonths] = useState(
    course?.validityMonths !== undefined ? String(course.validityMonths) : "",
  );
  const [active, setActive] = useState(course?.active ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, CourseFieldError>>({});

  const err = (k: string) => (fieldErrors[k] ? t.errors[fieldErrors[k]] : undefined);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveTrainingCourse(course?.id ?? null, {
        code,
        name,
        description,
        standardId,
        durationHours,
        validityMonths,
        active,
      });
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        else if (res.error) toast.error(t.errors[res.error]);
        return;
      }
      toast.success("บันทึกหลักสูตรการอบรมแล้ว");
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={course ? "แก้ไขหลักสูตรการอบรม" : "เพิ่มหลักสูตรการอบรม"}
      closeLabel={t.common.close}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="course-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="course-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="crs-code" label="รหัสหลักสูตร" required error={err("code")}>
            <Input
              id="crs-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              invalid={!!fieldErrors.code}
            />
          </Field>
          <Field htmlFor="crs-standard" label={t.requirements.standard}>
            <Select id="crs-standard" value={standardId} onChange={(e) => setStandardId(e.target.value)}>
              <option value="">ไม่ระบุมาตรฐาน</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field htmlFor="crs-name" label="ชื่อหลักสูตร" required error={err("name")}>
          <Input
            id="crs-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={!!fieldErrors.name}
            placeholder="เช่น หลักสูตรระบบบริหารคุณภาพ ISO 9001"
          />
        </Field>

        <Field htmlFor="crs-desc" label="รายละเอียดหลักสูตร">
          <Textarea
            id="crs-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="วัตถุประสงค์หรือขอบเขตเนื้อหาของหลักสูตร"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="crs-hours" label="ระยะเวลาอบรม (ชั่วโมง)" error={err("durationHours")}>
            <Input
              id="crs-hours"
              type="number"
              min={1}
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              invalid={!!fieldErrors.durationHours}
              placeholder="เช่น 6"
            />
          </Field>
          <Field htmlFor="crs-validity" label="อายุใบรับรอง (เดือน)" error={err("validityMonths")}>
            <Input
              id="crs-validity"
              type="number"
              min={1}
              value={validityMonths}
              onChange={(e) => setValidityMonths(e.target.value)}
              invalid={!!fieldErrors.validityMonths}
              placeholder="เช่น 12"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-text cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          <span>เปิดใช้งานหลักสูตรนี้ (แสดงให้เลือกในหน้าบันทึกการอบรม)</span>
        </label>
      </form>
    </Modal>
  );
}
