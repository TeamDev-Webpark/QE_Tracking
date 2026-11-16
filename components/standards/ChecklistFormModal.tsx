"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Button, Field, Input, Modal, Select, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { departments } from "@/data/departments";
import { saveChecklist, type ActionResult, type ChecklistInput } from "@/lib/standards/actions";
import type { RequirementClauseOption } from "@/lib/standards/queries";
import type { ChecklistItem } from "@/lib/types";
import { RequirementSelect } from "./RequirementSelect";

const str = (n: number | undefined) => (n === undefined ? "" : String(n));

/** Add (item undefined) or edit a checklist item. Mount only while open. */
export function ChecklistFormModal({
  standardId,
  item,
  requirements,
  onClose,
}: {
  standardId: string;
  item?: ChecklistItem;
  requirements: RequirementClauseOption[];
  onClose: () => void;
}) {
  const { lang, t } = useI18n();
  const toast = useToast();

  const initialReqId = useMemo(() => {
    if (!item) return "";
    const exact =
      requirements.find((r) => r.checklistIds.includes(item.id)) ??
      requirements.find((r) => r.number === item.clause && r.departmentId === item.departmentId) ??
      requirements.find((r) => r.number === item.clause);
    return exact?.id ?? "";
  }, [item, requirements]);

  const [form, setForm] = useState<ChecklistInput>({
    requirementId: initialReqId,
    previousRequirementId: initialReqId || undefined,
    clause: item?.clause ?? "",
    title: item?.title ?? "",
    departmentId: item?.departmentId ?? "",
    type: item?.type ?? "pass_fail",
    operator: item?.criteria?.operator ?? "between",
    min: str(item?.criteria?.min),
    max: str(item?.criteria?.max),
    unit: item?.criteria?.unit ?? "",
  });
  const [result, setResult] = useState<ActionResult>();
  const [pending, startTransition] = useTransition();
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const err = (key: string) => (errors[key] ? t.errors[errors[key]] : undefined);
  const set = (key: keyof ChecklistInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveChecklist(standardId, item?.id, form);
      if (res.ok) {
        toast.success(t.checklist.saved);
        onClose();
      } else {
        setResult(res);
        if (res.error) toast.error(t.errors[res.error]);
      }
    });
  };

  const showMin = form.operator !== "lte";
  const showMax = form.operator !== "gte";

  return (
    <Modal
      open
      size="lg"
      onClose={pending ? () => {} : onClose}
      closeLabel={t.common.close}
      title={item ? t.checklist.editTitle : t.checklist.addTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="checklist-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="checklist-form" onSubmit={submit} className="space-y-4" noValidate>
        {result && !result.ok && result.error && (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {t.errors[result.error]}
          </p>
        )}

        <Field
          label={t.checklist.clause}
          htmlFor="cl-clause"
          required
          hint={t.checklist.clauseHint}
          error={err("requirementId") ?? err("clause")}
        >
          <RequirementSelect
            requirements={requirements}
            value={form.requirementId}
            departmentFilter={form.departmentId}
            invalid={!!(errors.requirementId || errors.clause)}
            onSelect={(req) =>
              setForm((f) => ({
                ...f,
                requirementId: req.id,
                clause: req.number,
                departmentId: f.departmentId || req.departmentId,
              }))
            }
          />
        </Field>

        <Field label={t.checklist.item} htmlFor="cl-title" required error={err("title")}>
          <Input id="cl-title" value={form.title} onChange={set("title")} invalid={!!errors.title} autoFocus />
        </Field>

        <Field label={t.checklist.department} htmlFor="cl-dept" required error={err("departmentId")}>
          <Select id="cl-dept" value={form.departmentId} onChange={set("departmentId")} invalid={!!errors.departmentId}>
            <option value="">{t.checklist.selectDepartment}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {lang === "en" ? d.nameEn : d.name}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t.checklist.type}</legend>
          <div className="grid grid-cols-2 gap-3">
            {(["pass_fail", "numeric"] as const).map((type) => (
              <label
                key={type}
                className={`flex cursor-pointer items-center gap-2 rounded-control border px-4 py-3 text-sm font-semibold ${
                  form.type === type ? "border-primary bg-primary-soft text-primary" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={type}
                  checked={form.type === type}
                  onChange={() => setForm((f) => ({ ...f, type }))}
                  className="accent-primary"
                />
                {type === "pass_fail" ? t.checklist.typePassFail : t.checklist.typeNumeric}
              </label>
            ))}
          </div>
        </fieldset>

        {form.type === "numeric" && (
          <div className="space-y-4 rounded-control bg-page p-4">
            <p className="text-sm font-bold">{t.checklist.criteria}</p>
            <Field label={t.checklist.operator} htmlFor="cl-op">
              <Select id="cl-op" value={form.operator} onChange={set("operator")} className="bg-surface">
                <option value="between">{t.checklist.opBetween}</option>
                <option value="gte">{t.checklist.opGte}</option>
                <option value="lte">{t.checklist.opLte}</option>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              {showMin && (
                <Field label={t.checklist.min} htmlFor="cl-min" required error={err("min")}>
                  <Input id="cl-min" inputMode="decimal" value={form.min} onChange={set("min")} invalid={!!errors.min} className="bg-surface" />
                </Field>
              )}
              {showMax && (
                <Field label={t.checklist.max} htmlFor="cl-max" required error={err("max")}>
                  <Input id="cl-max" inputMode="decimal" value={form.max} onChange={set("max")} invalid={!!errors.max} className="bg-surface" />
                </Field>
              )}
              <Field label={t.checklist.unit} htmlFor="cl-unit" hint={t.checklist.unitHint}>
                <Input id="cl-unit" value={form.unit} onChange={set("unit")} className="bg-surface" />
              </Field>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
