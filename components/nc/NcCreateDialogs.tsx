"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { RequirementSelect } from "@/components/standards/RequirementSelect";
import { ResultBadge } from "@/components/standards/ResultBadge";
import { departments } from "@/data/departments";
import { departmentName, formatDateTime } from "@/lib/format";
import { createNc, createNcFromChecklist, type NcInput, type NcResult } from "@/lib/nc/actions";
import type { FailedCandidate, NcRequirementOption, StandardOption } from "@/lib/nc/queries";

function ErrorBanner({ result }: { result?: NcResult }) {
  const { t } = useI18n();
  if (!result || result.ok || !result.error) return null;
  return (
    <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
      {t.errors[result.error]}
    </p>
  );
}

/** Admin: create an NC by hand. Opens the new NC after saving. */
export function NcCreateDialog({
  standards,
  requirements = [],
  onClose,
}: {
  standards: StandardOption[];
  requirements?: NcRequirementOption[];
  onClose: () => void;
}) {
  const { lang, t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<NcInput>({ title: "", description: "", standardId: "", clause: "", departmentId: "" });
  const [selectedReqId, setSelectedReqId] = useState("");
  const [result, setResult] = useState<NcResult>();
  const [pending, startTransition] = useTransition();
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const err = (k: string) => (errors[k] ? t.errors[errors[k]] : undefined);
  const set = (k: keyof NcInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const filteredReqs = useMemo(
    () => requirements.filter((r) => r.standardId === form.standardId),
    [requirements, form.standardId],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createNc(form);
      if (res.ok) {
        toast.success(t.nc.saved);
        onClose();
        if (res.id) router.push(`/corrective-actions/${res.id}`);
      } else setResult(res);
    });
  };

  return (
    <Modal
      open
      size="lg"
      onClose={pending ? () => {} : onClose}
      closeLabel={t.common.close}
      title={t.nc.createTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="nc-form" disabled={pending}>
            {pending ? t.common.saving : t.nc.create}
          </Button>
        </>
      }
    >
      <form id="nc-form" onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBanner result={result} />
        <Field label={t.nc.title} htmlFor="nc-title" required error={err("title")}>
          <Input id="nc-title" value={form.title} onChange={set("title")} invalid={!!errors.title} autoFocus />
        </Field>
        <Field label={t.nc.description} htmlFor="nc-desc" required error={err("description")}>
          <Textarea id="nc-desc" rows={3} value={form.description} onChange={set("description")} invalid={!!errors.description} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.requirements.standard} htmlFor="nc-std" required error={err("standardId")}>
            <Select
              id="nc-std"
              value={form.standardId}
              onChange={(e) => {
                setSelectedReqId("");
                setForm((f) => ({ ...f, standardId: e.target.value, clause: "" }));
              }}
              invalid={!!errors.standardId}
            >
              <option value="">{t.requirements.selectStandard}</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.nc.department} htmlFor="nc-dept" required error={err("departmentId")}>
            <Select id="nc-dept" value={form.departmentId} onChange={set("departmentId")} invalid={!!errors.departmentId}>
              <option value="">{t.checklist.selectDepartment}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {lang === "en" ? d.nameEn : d.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t.nc.clause} htmlFor="nc-clause" hint={t.checklist.clauseHint}>
          {form.standardId ? (
            <RequirementSelect
              key={`${form.standardId}:${form.departmentId}`}
              requirements={filteredReqs}
              value={selectedReqId}
              departmentFilter={form.departmentId || undefined}
              onSelect={(req) => {
                setSelectedReqId(req.id);
                setForm((f) => ({
                  ...f,
                  clause: req.number,
                  departmentId: f.departmentId || req.departmentId,
                }));
              }}
            />
          ) : (
            <p className="rounded-control border border-border bg-page px-3 py-2 text-xs text-text-muted">
              {t.nc.selectStandardFirst}
            </p>
          )}
        </Field>
      </form>
    </Modal>
  );
}

/** Admin: pick a failed checklist result and create an NC from it. */
export function NcFromChecklistDialog({ candidates, onClose }: { candidates: FailedCandidate[]; onClose: () => void }) {
  const { lang, t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [result, setResult] = useState<NcResult>();
  const [pendingId, setPendingId] = useState<string>();
  const [, startTransition] = useTransition();

  const create = (checklistId: string) => {
    setPendingId(checklistId);
    startTransition(async () => {
      const res = await createNcFromChecklist(checklistId);
      setPendingId(undefined);
      if (res.ok) {
        toast.success(t.nc.saved);
        onClose();
        if (res.id) router.push(`/corrective-actions/${res.id}`);
      } else setResult(res);
    });
  };

  return (
    <Modal open size="lg" onClose={pendingId ? () => {} : onClose} closeLabel={t.common.close} title={t.nc.fromChecklistTitle}>
      <div className="space-y-3">
        <p className="text-sm text-text-muted">{t.nc.fromChecklistHint}</p>
        <ErrorBanner result={result} />
        {candidates.length === 0 ? (
          <p className="rounded-control bg-page py-8 text-center text-sm text-text-muted">{t.nc.noCandidates}</p>
        ) : (
          candidates.map((c) => (
            <div key={c.checklistId} className="flex flex-wrap items-center gap-3 rounded-control border border-border p-3">
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-xs text-text-muted">
                  {c.standardLabel} · {c.clause} · {departmentName(c.departmentId, lang)}
                </p>
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <ResultBadge passed={false} />
                  {typeof c.latest.value === "number" && (
                    <span className="font-semibold text-text">
                      {c.latest.value} {c.unit}
                    </span>
                  )}
                  {formatDateTime(c.latest.checkedAt, lang)}
                </p>
              </div>
              <Button size="sm" onClick={() => create(c.checklistId)} disabled={!!pendingId}>
                {pendingId === c.checklistId ? t.common.saving : t.nc.createThis}
              </Button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
