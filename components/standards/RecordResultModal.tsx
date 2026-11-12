"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, Field, Input, Modal, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { evaluateChecklist, formatCriteria } from "@/lib/checklist";
import { toDateTimeLocal } from "@/lib/format";
import { recordResult, type ActionResult } from "@/lib/standards/actions";
import type { ChecklistItem } from "@/lib/types";
import { ResultBadge } from "./ResultBadge";

/** Record an inspection result. Shows the Pass/Fail evaluation before saving. Mount only while open. */
export function RecordResultModal({ item, onClose }: { item: ChecklistItem; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [passFail, setPassFail] = useState<boolean>();
  const [numeric, setNumeric] = useState("");
  const [note, setNote] = useState("");
  const [checkedAt, setCheckedAt] = useState(() => toDateTimeLocal(new Date()));
  const [result, setResult] = useState<ActionResult>();
  const [pending, startTransition] = useTransition();
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};

  // Live preview of the evaluation (the server evaluates again when saving).
  const numericValue = numeric.trim() === "" ? NaN : Number(numeric);
  const preview =
    item.type === "pass_fail"
      ? passFail
      : Number.isFinite(numericValue)
        ? evaluateChecklist(item, numericValue)
        : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const at = new Date(checkedAt);
    startTransition(async () => {
      const res = await recordResult(item.id, {
        value: item.type === "pass_fail" ? (passFail ?? "") : numeric,
        checkedAt: Number.isNaN(at.getTime()) ? checkedAt : at.toISOString(),
        note,
      });
      if (res.ok) {
        toast.success(t.checklist.resultSaved);
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
      title={t.checklist.recordTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="result-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="result-form" onSubmit={submit} className="space-y-4" noValidate>
        {result && !result.ok && result.error && (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {t.errors[result.error]}
          </p>
        )}

        <div className="rounded-control bg-page p-4 text-sm">
          <p className="font-bold">
            {item.clause} · {item.title}
          </p>
          {item.criteria && (
            <p className="mt-1 text-text-muted">
              {t.checklist.criteria}: <span className="font-semibold text-text">{formatCriteria(item.criteria)}</span>
            </p>
          )}
        </div>

        {item.type === "pass_fail" ? (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              {t.checklist.result}
              <span className="ml-0.5 text-danger">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {[true, false].map((v) => (
                <label
                  key={String(v)}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-control border px-4 py-3 text-sm font-bold ${
                    passFail === v
                      ? v
                        ? "border-success bg-success-soft text-success"
                        : "border-danger bg-danger-soft text-danger"
                      : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="passFail"
                    checked={passFail === v}
                    onChange={() => setPassFail(v)}
                    className="sr-only"
                  />
                  {v ? t.checklist.pass : t.checklist.fail}
                </label>
              ))}
            </div>
            {errors.value && <p className="mt-1.5 text-xs font-semibold text-danger">{t.errors[errors.value]}</p>}
          </fieldset>
        ) : (
          <Field
            label={`${t.checklist.value}${item.criteria?.unit ? ` (${item.criteria.unit})` : ""}`}
            htmlFor="res-value"
            required
            error={errors.value && t.errors[errors.value]}
          >
            <Input
              id="res-value"
              inputMode="decimal"
              value={numeric}
              onChange={(e) => setNumeric(e.target.value)}
              invalid={!!errors.value}
              autoFocus
            />
          </Field>
        )}

        <Field label={t.checklist.checkedAt} htmlFor="res-at" required error={errors.checkedAt && t.errors[errors.checkedAt]}>
          <Input
            id="res-at"
            type="datetime-local"
            value={checkedAt}
            max={toDateTimeLocal(new Date())}
            onChange={(e) => setCheckedAt(e.target.value)}
            invalid={!!errors.checkedAt}
          />
        </Field>

        {item.type === "numeric" && (
          <div className="flex items-center justify-between rounded-control border border-border px-4 py-3 text-sm">
            <span className="font-semibold">{t.checklist.preview}</span>
            {preview === undefined ? <span className="text-text-muted">–</span> : <ResultBadge passed={preview} />}
          </div>
        )}

        <Field label={t.checklist.note} htmlFor="res-note">
          <Textarea
            id="res-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.checklist.notePlaceholder}
          />
        </Field>
      </form>
    </Modal>
  );
}
