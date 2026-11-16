"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { LinkedChecklistPicker } from "./LinkedChecklistPicker";
import { useI18n } from "@/components/providers/I18nProvider";
import { getUsers } from "@/data";
import { departments } from "@/data/departments";
import { saveRequirement, type RequirementInput } from "@/lib/requirements/actions";
import type { ChecklistOption, StandardOption } from "@/lib/requirements/queries";
import type { ActionResult } from "@/lib/standards/actions";
import type { Requirement } from "@/lib/types";
import { displayName } from "@/lib/user";

/** Add (requirement undefined) or edit a requirement. Mount only while open. */
export function RequirementFormModal({
  requirement,
  standards,
  checklists,
  onClose,
}: {
  requirement?: Requirement;
  standards: StandardOption[];
  checklists: ChecklistOption[];
  onClose: () => void;
}) {
  const { lang, t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState<RequirementInput>({
    standardId: requirement?.standardId ?? "",
    number: requirement?.number ?? "",
    name: requirement?.name ?? "",
    description: requirement?.description ?? "",
    departmentId: requirement?.departmentId ?? "",
    ownerId: requirement?.ownerId ?? "",
    checklistIds: requirement?.checklistIds ?? [],
  });
  const [result, setResult] = useState<ActionResult>();
  const [pending, startTransition] = useTransition();
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const err = (key: string) => (errors[key] ? t.errors[errors[key]] : undefined);
  const set = (key: keyof RequirementInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const options = checklists.filter((c) => c.standardId === form.standardId);

  const toggle = (id: string) =>
    setForm((f) => ({
      ...f,
      checklistIds: f.checklistIds.includes(id) ? f.checklistIds.filter((x) => x !== id) : [...f.checklistIds, id],
    }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveRequirement(requirement?.id, form);
      if (res.ok) {
        toast.success(t.requirements.saved);
        onClose();
      } else {
        setResult(res);
        if (res.error) toast.error(t.errors[res.error]);
      }
    });
  };

  return (
    <Modal
      open
      size="lg"
      onClose={pending ? () => {} : onClose}
      closeLabel={t.common.close}
      title={requirement ? t.requirements.editTitle : t.requirements.addTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="requirement-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="requirement-form" onSubmit={submit} className="space-y-4" noValidate>
        {result && !result.ok && result.error && (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {t.errors[result.error]}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.requirements.standard} htmlFor="req-std" required error={err("standardId")}>
            <Select
              id="req-std"
              value={form.standardId}
              // Links only make sense within one standard, so reset them on change.
              onChange={(e) => setForm((f) => ({ ...f, standardId: e.target.value, checklistIds: [] }))}
              invalid={!!errors.standardId}
              autoFocus
            >
              <option value="">{t.requirements.selectStandard}</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.requirements.number} htmlFor="req-no" required hint={t.requirements.numberHint} error={err("number")}>
            <Input id="req-no" value={form.number} onChange={set("number")} invalid={!!errors.number} />
          </Field>
        </div>

        <Field label={t.requirements.name} htmlFor="req-name" required error={err("name")}>
          <Input id="req-name" value={form.name} onChange={set("name")} invalid={!!errors.name} />
        </Field>
        <Field label={t.requirements.description} htmlFor="req-desc">
          <Textarea id="req-desc" rows={2} value={form.description} onChange={set("description")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.requirements.department} htmlFor="req-dept" required error={err("departmentId")}>
            <Select id="req-dept" value={form.departmentId} onChange={set("departmentId")} invalid={!!errors.departmentId}>
              <option value="">{t.checklist.selectDepartment}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {lang === "en" ? d.nameEn : d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.requirements.owner} htmlFor="req-owner" required error={err("ownerId")}>
            <Select id="req-owner" value={form.ownerId} onChange={set("ownerId")} invalid={!!errors.ownerId}>
              <option value="">{t.requirements.selectOwner}</option>
              {getUsers().map((u) => (
                <option key={u.id} value={u.id}>
                  {displayName(u, lang)} ({u.position})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <LinkedChecklistPicker
          key={form.standardId || "none"}
          standardId={form.standardId}
          options={options}
          selectedIds={form.checklistIds}
          onToggle={toggle}
        />
      </form>
    </Modal>
  );
}
