"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, Field, Input, Modal, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { defaultNextReviewDate } from "@/lib/documents";
import {
  cancelDocument,
  createVersion,
  markDocumentReviewed,
  setUserLimit,
  type DocResult,
} from "@/lib/documents/actions";

/** Shared shell: one text/number/date field + Save/Cancel, shows field and action errors. */
function SingleFieldDialog({
  title,
  label,
  note,
  confirmLabel,
  danger,
  multiline,
  inputType = "text",
  inputMode,
  initial = "",
  successMessage,
  extraAction,
  run,
  onClose,
}: {
  title: string;
  label: string;
  note?: string;
  confirmLabel: string;
  danger?: boolean;
  multiline?: boolean;
  inputType?: string;
  inputMode?: "numeric" | "text";
  initial?: string;
  successMessage?: string;
  extraAction?: { label: string; run: () => Promise<DocResult> };
  run: (value: string) => Promise<DocResult>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const [result, setResult] = useState<DocResult>();
  const [pending, startTransition] = useTransition();
  const fieldError = result && !result.ok && result.fieldErrors ? Object.values(result.fieldErrors)[0] : undefined;

  const go = (action: () => Promise<DocResult>) =>
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        if (successMessage) toast.success(successMessage);
        onClose();
      } else {
        setResult(res);
        if (res.error) toast.error(t.errors[res.error]);
      }
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(() => run(value));
  };

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      closeLabel={t.common.close}
      title={title}
      footer={
        <>
          {extraAction && (
            <Button variant="secondary" className="mr-auto" disabled={pending} onClick={() => go(extraAction.run)}>
              {extraAction.label}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="single-field-form" variant={danger ? "danger" : "primary"} disabled={pending}>
            {pending ? t.common.saving : confirmLabel}
          </Button>
        </>
      }
    >
      <form id="single-field-form" onSubmit={submit} className="space-y-4" noValidate>
        {note && <p className="rounded-control bg-page px-4 py-3 text-sm">{note}</p>}
        {result && !result.ok && result.error && (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {t.errors[result.error]}
          </p>
        )}
        <Field label={label} htmlFor="single-field" required error={fieldError && t.errors[fieldError]}>
          {multiline ? (
            <Textarea id="single-field" rows={3} value={value} onChange={(e) => setValue(e.target.value)} invalid={!!fieldError} autoFocus />
          ) : (
            <Input
              id="single-field"
              type={inputType}
              inputMode={inputMode}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              invalid={!!fieldError}
              autoFocus
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}

export function NewVersionDialog({ docId, nextVersion, onClose }: { docId: string; nextVersion: number; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <SingleFieldDialog
      title={t.documents.newVersionTitle.replace("{n}", String(nextVersion))}
      label={t.documents.changeNote}
      note={t.documents.newVersionNote}
      confirmLabel={t.documents.newVersion}
      multiline
      successMessage={t.documents.versionCreated}
      run={(note) => createVersion(docId, note)}
      onClose={onClose}
    />
  );
}

export function CancelDocumentDialog({ docId, code, onClose }: { docId: string; code: string; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <SingleFieldDialog
      title={t.documents.cancelTitle}
      label={t.documents.cancelReason}
      note={t.documents.cancelMessage.replace("{code}", code)}
      confirmLabel={t.documents.cancel}
      danger
      multiline
      successMessage={t.documents.cancelled}
      run={(reason) => cancelDocument(docId, reason)}
      onClose={onClose}
    />
  );
}

export function AdjustLimitDialog({
  docId,
  userId,
  userName,
  currentLimit,
  custom,
  onClose,
}: {
  docId: string;
  userId: string;
  userName: string;
  currentLimit: number;
  custom: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <SingleFieldDialog
      title={t.documents.adjustTitle.replace("{name}", userName)}
      label={t.documents.newLimit}
      note={t.documents.downloadLimitHint}
      confirmLabel={t.common.save}
      inputMode="numeric"
      initial={String(currentLimit)}
      successMessage={t.documents.limitUpdated}
      extraAction={custom ? { label: t.documents.useDefault, run: () => setUserLimit(docId, userId, null) } : undefined}
      run={(limit) => setUserLimit(docId, userId, limit)}
      onClose={onClose}
    />
  );
}

export function ReviewDocumentDialog({
  docId,
  onClose,
}: {
  docId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <SingleFieldDialog
      title={t.documents.reviewTitle}
      label={t.documents.nextReviewDate}
      note={t.documents.reviewNote}
      confirmLabel={t.common.save}
      inputType="date"
      initial={defaultNextReviewDate()}
      successMessage={t.documents.reviewSaved}
      run={(date) => markDocumentReviewed(docId, date)}
      onClose={onClose}
    />
  );
}
