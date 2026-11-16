"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { getUsers } from "@/data";
import { evaluateNumeric, formatCriteria } from "@/lib/checklist";
import { departmentName } from "@/lib/format";
import { issueCar, savePlan, submitForVerification, verifyNc, type NcResult } from "@/lib/nc/actions";
import type { NcView, SourceChecklistInfo } from "@/lib/nc/queries";
import { displayName } from "@/lib/user";
import { cn } from "@/lib/cn";

/** Modal + form shell that runs an action and shows its errors. */
function FormDialog({
  title,
  submitLabel,
  successMessage,
  run,
  onClose,
  children,
}: {
  title: string;
  submitLabel: string;
  successMessage?: string;
  run: () => Promise<NcResult>;
  onClose: () => void;
  children: (errors: Record<string, string>) => ReactNode;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [result, setResult] = useState<NcResult>();
  const [pending, startTransition] = useTransition();
  const errors: Record<string, string> = {};
  if (result && !result.ok) for (const [k, v] of Object.entries(result.fieldErrors ?? {})) errors[k] = t.errors[v];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await run();
      if (res.ok) {
        if (successMessage) toast.success(successMessage);
        onClose();
      } else setResult(res);
    });
  };

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      closeLabel={t.common.close}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="nc-workflow-form" disabled={pending}>
            {pending ? t.common.saving : submitLabel}
          </Button>
        </>
      }
    >
      <form id="nc-workflow-form" onSubmit={submit} className="space-y-4" noValidate>
        {result && !result.ok && result.error && (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {t.errors[result.error]}
          </p>
        )}
        {children(errors)}
      </form>
    </Modal>
  );
}

/** Admin: issue or edit the CAR (responsible person + due date). */
export function IssueCarDialog({ nc, today, onClose }: { nc: NcView; today: string; onClose: () => void }) {
  const { lang, t } = useI18n();
  const [ownerId, setOwnerId] = useState(nc.car?.ownerId ?? "");
  const [dueDate, setDueDate] = useState(nc.car?.dueDate ?? "");
  // Suggest people of the NC's department first.
  const users = [...getUsers()].sort(
    (a, b) => Number(b.departmentId === nc.departmentId) - Number(a.departmentId === nc.departmentId),
  );
  return (
    <FormDialog
      title={nc.car ? t.nc.editCarTitle : t.nc.issueCarTitle}
      submitLabel={nc.car ? t.common.save : t.nc.issueCar}
      successMessage={t.nc.carSaved}
      run={() => issueCar(nc.id, { ownerId, dueDate })}
      onClose={onClose}
    >
      {(errors) => (
        <>
          <p className="rounded-control bg-page px-4 py-3 text-sm">
            {t.nc.department}: <span className="font-semibold">{departmentName(nc.departmentId, lang)}</span>
          </p>
          <Field label={t.nc.owner} htmlFor="car-owner" required error={errors.ownerId}>
            <Select id="car-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} invalid={!!errors.ownerId} autoFocus>
              <option value="">{t.requirements.selectOwner}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {displayName(u, lang)} · {departmentName(u.departmentId, lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.nc.dueDate} htmlFor="car-due" required error={errors.dueDate}>
            <Input id="car-due" type="date" min={today} value={dueDate} onChange={(e) => setDueDate(e.target.value)} invalid={!!errors.dueDate} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

/** Employee: root cause + corrective & preventive action (CAPA). */
export function PlanDialog({ nc, onClose }: { nc: NcView; onClose: () => void }) {
  const { t } = useI18n();
  const [rootCause, setRootCause] = useState(nc.rootCause);
  const [correctiveAction, setCorrectiveAction] = useState(nc.correctiveAction);
  const [preventiveAction, setPreventiveAction] = useState(nc.preventiveAction ?? "");
  return (
    <FormDialog
      title={t.nc.planTitle}
      submitLabel={t.common.save}
      successMessage={t.nc.planSaved}
      run={() => savePlan(nc.id, { rootCause, correctiveAction, preventiveAction })}
      onClose={onClose}
    >
      {(errors) => (
        <>
          <Field label={t.nc.rootCause} htmlFor="nc-root" required error={errors.rootCause}>
            <Textarea id="nc-root" rows={3} value={rootCause} onChange={(e) => setRootCause(e.target.value)} invalid={!!errors.rootCause} autoFocus />
          </Field>
          <Field label={t.nc.correctiveAction} htmlFor="nc-action" required error={errors.correctiveAction}>
            <Textarea
              id="nc-action"
              rows={3}
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              invalid={!!errors.correctiveAction}
            />
          </Field>
          <Field label={t.nc.preventiveAction} htmlFor="nc-preventive" hint={t.nc.preventiveHint}>
            <Textarea
              id="nc-preventive"
              rows={2}
              value={preventiveAction}
              onChange={(e) => setPreventiveAction(e.target.value)}
            />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

/** Employee: record CAPA (root cause, corrective/preventive action) & result note, then submit for verification. */
export function ProgressDialog({ nc, onClose }: { nc: NcView; onClose: () => void }) {
  const { t } = useI18n();
  const [rootCause, setRootCause] = useState(nc.rootCause);
  const [correctiveAction, setCorrectiveAction] = useState(nc.correctiveAction);
  const [preventiveAction, setPreventiveAction] = useState(nc.preventiveAction ?? "");
  const [note, setNote] = useState("");
  return (
    <FormDialog
      title={t.nc.submitTitle}
      submitLabel={t.nc.submit}
      successMessage={t.nc.submittedMsg}
      run={() => submitForVerification(nc.id, { rootCause, correctiveAction, preventiveAction, note })}
      onClose={onClose}
    >
      {(errors) => (
        <>
          <Field label={t.nc.rootCause} htmlFor="nc-root" required error={errors.rootCause}>
            <Textarea
              id="nc-root"
              rows={2}
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              invalid={!!errors.rootCause}
              autoFocus
            />
          </Field>
          <Field label={t.nc.correctiveAction} htmlFor="nc-action" required error={errors.correctiveAction}>
            <Textarea
              id="nc-action"
              rows={2}
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              invalid={!!errors.correctiveAction}
            />
          </Field>
          <Field label={t.nc.preventiveAction} htmlFor="nc-preventive" hint={t.nc.preventiveHint}>
            <Textarea
              id="nc-preventive"
              rows={2}
              value={preventiveAction}
              onChange={(e) => setPreventiveAction(e.target.value)}
            />
          </Field>
          <Field label={t.nc.progressNote} htmlFor="nc-note" required error={errors.note}>
            <Textarea id="nc-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} invalid={!!errors.note} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

/** Admin: verify the correction → close, or send back. */
export function VerifyDialog({
  nc,
  sourceChecklist,
  onClose,
}: {
  nc: NcView;
  sourceChecklist?: SourceChecklistInfo;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const isNumeric = sourceChecklist?.type === "numeric" && !!sourceChecklist.criteria;
  const [measuredValue, setMeasuredValue] = useState("");
  const [accepted, setAccepted] = useState<boolean>();
  const [note, setNote] = useState("");

  const parsedNum = measuredValue.trim() !== "" ? Number(measuredValue) : Number.NaN;
  const autoPassed =
    isNumeric && sourceChecklist?.criteria && Number.isFinite(parsedNum)
      ? evaluateNumeric(sourceChecklist.criteria, parsedNum)
      : undefined;

  return (
    <FormDialog
      title={t.nc.verifyTitle}
      submitLabel={t.common.save}
      successMessage={t.nc.verifiedMsg}
      run={async () => {
        if (isNumeric) {
          return verifyNc(nc.id, { measuredValue, note });
        }
        return accepted === undefined
          ? { ok: false, fieldErrors: { result: "required" } }
          : verifyNc(nc.id, { accepted, note });
      }}
      onClose={onClose}
    >
      {(errors) => (
        <>
          {isNumeric && sourceChecklist?.criteria ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-control border border-border bg-page px-4 py-3 text-sm">
                <span className="text-text-muted">{t.checklist.criteria}:</span>
                <span className="font-bold text-primary">{formatCriteria(sourceChecklist.criteria)}</span>
              </div>
              <Field
                label={`${t.checklist.value}${sourceChecklist.criteria.unit ? ` (${sourceChecklist.criteria.unit})` : ""}`}
                htmlFor="nc-measured"
                required
                error={errors.measuredValue}
              >
                <Input
                  id="nc-measured"
                  inputMode="decimal"
                  value={measuredValue}
                  onChange={(e) => setMeasuredValue(e.target.value)}
                  invalid={!!errors.measuredValue}
                  placeholder={`กรอกค่าที่วัดได้ใหม่ เช่น ${sourceChecklist.criteria.min ?? sourceChecklist.criteria.max ?? ""}`}
                  autoFocus
                />
              </Field>
              {autoPassed !== undefined && (
                <div
                  className={cn(
                    "flex items-center justify-between rounded-control border px-4 py-3 text-sm font-bold",
                    autoPassed
                      ? "border-success bg-success-soft text-success"
                      : "border-danger bg-danger-soft text-danger",
                  )}
                >
                  <span>{t.checklist.preview}:</span>
                  <span>{autoPassed ? `✓ ${t.nc.verifyPass}` : `✗ ${t.nc.verifyFail}`}</span>
                </div>
              )}
            </div>
          ) : (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                {t.nc.verifyResult}
                <span className="ml-0.5 text-danger">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[true, false].map((v) => (
                  <label
                    key={String(v)}
                    className={cn(
                      "flex cursor-pointer items-center justify-center rounded-control border px-4 py-3 text-sm font-bold",
                      accepted === v
                        ? v
                          ? "border-success bg-success-soft text-success"
                          : "border-danger bg-danger-soft text-danger"
                        : "border-border",
                    )}
                  >
                    <input type="radio" name="verify" className="sr-only" checked={accepted === v} onChange={() => setAccepted(v)} />
                    {v ? `✓ ${t.nc.verifyPass}` : `✗ ${t.nc.verifyFail}`}
                  </label>
                ))}
              </div>
              {errors.result && <p className="mt-1.5 text-xs font-semibold text-danger">{errors.result}</p>}
            </fieldset>
          )}
          <Field label={t.nc.verifyNote} htmlFor="nc-vnote" required error={errors.note}>
            <Textarea id="nc-vnote" rows={3} value={note} onChange={(e) => setNote(e.target.value)} invalid={!!errors.note} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
