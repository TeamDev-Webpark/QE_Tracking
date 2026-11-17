"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { departments } from "@/data/departments";
import { saveKpi, type KpiInput, type KpiResultMsg } from "@/lib/kpi/actions";
import type { KpiView, StandardOption } from "@/lib/kpi/queries";

/** Add (kpi undefined) or edit a KPI, including Target and Actual. Mount only while open. */
export function KpiFormModal({
  kpi,
  standards,
  defaultPeriod,
  onClose,
}: {
  kpi?: KpiView;
  standards: StandardOption[];
  defaultPeriod: string;
  onClose: () => void;
}) {
  const { lang, t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState<KpiInput>({
    name: kpi?.name ?? "",
    description: kpi?.description ?? "",
    departmentId: kpi?.departmentId ?? "",
    standardId: kpi?.standardId ?? "",
    unit: kpi?.unit ?? "",
    direction: kpi?.direction ?? "higher",
    target: kpi ? String(kpi.target) : "",
    actual: kpi?.actual === null || kpi?.actual === undefined ? "" : String(kpi.actual),
    period: kpi?.period ?? defaultPeriod,
  });
  const [result, setResult] = useState<KpiResultMsg>();
  const [pending, startTransition] = useTransition();
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const err = (k: string) => (errors[k] ? t.errors[errors[k]] : undefined);
  const set = (k: keyof KpiInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePeriodChange = (nextPeriod: string) => {
    const existingEntry = kpi?.history?.find((h) => h.period === nextPeriod);
    if (existingEntry) {
      setForm((f) => ({
        ...f,
        period: nextPeriod,
        target: String(existingEntry.target),
        actual: existingEntry.actual === null ? "" : String(existingEntry.actual),
      }));
    } else {
      setForm((f) => ({ ...f, period: nextPeriod }));
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveKpi(kpi?.id, form);
      if (res.ok) {
        toast.success(t.kpi.saved);
        onClose();
      } else setResult(res);
    });
  };

  return (
    <Modal
      open
      size="lg"
      onClose={pending ? () => {} : onClose}
      closeLabel={t.common.close}
      title={kpi ? t.kpi.editTitle : t.kpi.addTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="kpi-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="kpi-form" onSubmit={submit} className="space-y-4" noValidate>
        {result && !result.ok && result.error && (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {t.errors[result.error]}
          </p>
        )}
        <Field label={t.kpi.name} htmlFor="kpi-name" required error={err("name")}>
          <Input id="kpi-name" value={form.name} onChange={set("name")} invalid={!!errors.name} autoFocus />
        </Field>
        <Field label={t.kpi.description} htmlFor="kpi-desc">
          <Textarea id="kpi-desc" rows={2} value={form.description} onChange={set("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.kpi.department} htmlFor="kpi-dept" required error={err("departmentId")}>
            <Select id="kpi-dept" value={form.departmentId} onChange={set("departmentId")} invalid={!!errors.departmentId}>
              <option value="">{t.checklist.selectDepartment}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {lang === "en" ? d.nameEn : d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.kpi.standard} htmlFor="kpi-std" error={err("standardId")}>
            <Select id="kpi-std" value={form.standardId} onChange={set("standardId")}>
              <option value="">{t.kpi.noStandard}</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.kpi.direction} htmlFor="kpi-dir" required>
            <Select id="kpi-dir" value={form.direction} onChange={set("direction")}>
              <option value="higher">{t.kpi.higher}</option>
              <option value="lower">{t.kpi.lower}</option>
            </Select>
          </Field>
          <Field label={t.kpi.unit} htmlFor="kpi-unit" hint={t.kpi.unitHint}>
            <Input id="kpi-unit" value={form.unit} onChange={set("unit")} />
          </Field>
        </div>
        <div className="grid gap-4 rounded-control bg-page p-4 sm:grid-cols-3">
          <Field label={t.kpi.target} htmlFor="kpi-target" required error={err("target")}>
            <Input id="kpi-target" inputMode="decimal" value={form.target} onChange={set("target")} invalid={!!errors.target} className="bg-surface" />
          </Field>
          <Field label={t.kpi.actual} htmlFor="kpi-actual" hint={t.kpi.actualHint} error={err("actual")}>
            <Input id="kpi-actual" inputMode="decimal" value={form.actual} onChange={set("actual")} invalid={!!errors.actual} className="bg-surface" />
          </Field>
          <Field label={t.kpi.period} htmlFor="kpi-period" required error={err("period")}>
            <Input
              id="kpi-period"
              type="month"
              value={form.period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              invalid={!!errors.period}
              className="bg-surface"
            />
          </Field>
        </div>

        {kpi?.history && kpi.history.length > 0 && (
          <div className="rounded-control border border-border bg-page p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-text">ประวัติผลการวัดรายเดือน (คลิกเลือกเดือนเพื่อดูหรือแก้ไข)</p>
              <span className="text-[11px] text-text-muted">เก็บประวัติแยกตามเดือนอัตโนมัติ</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {kpi.history.map((h) => {
                const active = form.period === h.period;
                return (
                  <button
                    key={h.period}
                    type="button"
                    onClick={() => handlePeriodChange(h.period)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                      active
                        ? "border-primary bg-primary/10 font-bold text-primary"
                        : "border-border bg-surface text-text hover:border-primary/40"
                    }`}
                  >
                    <span className="block text-[11px] text-text-muted">{h.period}</span>
                    <span className="tabular-nums">
                      Actual: <strong>{h.actual === null ? "–" : `${h.actual}${kpi.unit ? ` ${kpi.unit}` : ""}`}</strong>{" "}
                      <span className="text-[11px] text-text-muted">(เป้า {h.target})</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
