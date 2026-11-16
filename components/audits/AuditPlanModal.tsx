"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { departments } from "@/data/departments";
import { departmentName } from "@/lib/format";
import { todayInBangkok } from "@/lib/nc";
import { saveAuditPlan } from "@/lib/audits/actions";
import type { AuditView } from "@/lib/audits/queries";
import type { FieldError } from "@/lib/standards/actions";

export function AuditPlanModal({
  open,
  audit,
  standards,
  auditors,
  nextCode,
  onClose,
}: {
  open: boolean;
  audit: AuditView | null;
  standards: { id: string; label: string }[];
  auditors: { id: string; name: string; role: string }[];
  nextCode: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <AuditPlanInner
      key={audit?.id ?? "new"}
      audit={audit}
      standards={standards}
      auditors={auditors}
      nextCode={nextCode}
      onClose={onClose}
    />
  );
}

function AuditPlanInner({
  audit,
  standards,
  auditors,
  nextCode,
  onClose,
}: {
  audit: AuditView | null;
  standards: { id: string; label: string }[];
  auditors: { id: string; name: string; role: string }[];
  nextCode: string;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [code, setCode] = useState(audit?.code ?? nextCode);
  const [title, setTitle] = useState(audit?.title ?? "");
  const [standardId, setStandardId] = useState(audit?.standardId ?? standards[0]?.id ?? "");
  const [departmentId, setDepartmentId] = useState(audit?.departmentId ?? departments[0]?.id ?? "");
  const [leadAuditorId, setLeadAuditorId] = useState(audit?.leadAuditorId ?? auditors[0]?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState(audit?.scheduledDate ?? todayInBangkok());
  const [scope, setScope] = useState(audit?.scope ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError>>({});

  const err = (k: string) => (fieldErrors[k] ? t.errors[fieldErrors[k]] : undefined);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    startTransition(async () => {
      const res = await saveAuditPlan(audit?.id ?? null, {
        code,
        title,
        standardId,
        departmentId,
        leadAuditorId,
        scheduledDate,
        scope,
      });
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        else toast.error(t.errors.forbidden);
        return;
      }
      toast.success("บันทึกแผนการตรวจประเมินเรียบร้อยแล้ว");
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      size="md"
      title={audit ? "แก้ไขแผนการตรวจประเมิน" : "สร้างแผนการตรวจประเมินใหม่"}
      closeLabel={t.common.close}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="audit-plan-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="audit-plan-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="audit-code" label="รหัสแผนตรวจ">
            <Input id="audit-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field htmlFor="audit-date" label="วันที่กำหนดตรวจ" required error={err("scheduledDate")}>
            <Input
              id="audit-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              invalid={!!fieldErrors.scheduledDate}
            />
          </Field>
        </div>

        <Field htmlFor="audit-title" label="หัวข้อ / ชื่องานตรวจ" required error={err("title")}>
          <Input
            id="audit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น ตรวจประเมินระบบคุณภาพประจำปี แผนกผลิต"
            invalid={!!fieldErrors.title}
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="audit-std" label="มาตรฐานที่ตรวจ" required error={err("standardId")}>
            <Select id="audit-std" value={standardId} onChange={(e) => setStandardId(e.target.value)}>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="audit-dept" label="แผนกที่รับการตรวจ" required error={err("departmentId")}>
            <Select id="audit-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {departmentName(d.id, lang)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field htmlFor="audit-lead" label="หัวหน้าทีมผู้ตรวจ (Lead Auditor)" required error={err("leadAuditorId")}>
          <Select id="audit-lead" value={leadAuditorId} onChange={(e) => setLeadAuditorId(e.target.value)}>
            {auditors.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.toUpperCase()})
              </option>
            ))}
          </Select>
        </Field>

        <Field htmlFor="audit-scope" label="ขอบเขต / ข้อกำหนดที่มุ่งเน้น">
          <Textarea
            id="audit-scope"
            rows={2}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="เช่น ตรวจกระบวนการผลิต, การควบคุมเอกสาร และการปล่อยผ่านสินค้า..."
          />
        </Field>
      </form>
    </Modal>
  );
}
