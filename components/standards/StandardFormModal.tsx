"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, Field, Input, Modal, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { saveStandard, type ActionResult, type StandardInput } from "@/lib/standards/actions";
import type { IsoStandard } from "@/lib/types";

/** Add (standard undefined) or edit an ISO standard. Mount only while open. */
export function StandardFormModal({ standard, onClose }: { standard?: IsoStandard; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState<StandardInput>({
    code: standard?.code ?? "",
    version: standard?.version ?? "",
    name: standard?.name ?? "",
    description: standard?.description ?? "",
  });
  const [result, setResult] = useState<ActionResult>();
  const [pending, startTransition] = useTransition();
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const set = (key: keyof StandardInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveStandard(standard?.id, form);
      if (res.ok) {
        toast.success(t.standards.saved);
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
      onClose={pending ? () => {} : onClose}
      closeLabel={t.common.close}
      title={standard ? t.standards.editTitle : t.standards.addTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="standard-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="standard-form" onSubmit={submit} className="space-y-4" noValidate>
        {result && !result.ok && result.error && (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {t.errors[result.error]}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.standards.code} htmlFor="std-code" required hint={t.standards.codeHint} error={errors.code && t.errors[errors.code]}>
            <Input id="std-code" value={form.code} onChange={set("code")} invalid={!!errors.code} autoFocus />
          </Field>
          <Field label={t.standards.version} htmlFor="std-version" required hint={t.standards.versionHint} error={errors.version && t.errors[errors.version]}>
            <Input id="std-version" value={form.version} onChange={set("version")} invalid={!!errors.version} />
          </Field>
        </div>
        <Field label={t.standards.name} htmlFor="std-name" required error={errors.name && t.errors[errors.name]}>
          <Input id="std-name" value={form.name} onChange={set("name")} invalid={!!errors.name} />
        </Field>
        <Field label={t.standards.description} htmlFor="std-desc">
          <Textarea id="std-desc" rows={3} value={form.description} onChange={set("description")} />
        </Field>
      </form>
    </Modal>
  );
}
