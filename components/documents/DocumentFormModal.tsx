"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { getUsers } from "@/data";
import { departments } from "@/data/departments";
import { DOCUMENT_TYPES, inferDocumentType } from "@/lib/documents";
import { saveDocument, type DocResult, type DocumentInput } from "@/lib/documents/actions";
import type { DocumentRequirementOption, DocumentView, StandardOption } from "@/lib/documents/queries";
import { displayName } from "@/lib/user";

/** Add (doc undefined) or edit document details. Mount only while open. */
export function DocumentFormModal({
  doc,
  standards,
  requirements = [],
  onClose,
}: {
  doc?: DocumentView;
  standards: StandardOption[];
  requirements?: DocumentRequirementOption[];
  onClose: () => void;
}) {
  const { lang, t } = useI18n();
  const toast = useToast();
  const [typeTouched, setTypeTouched] = useState(Boolean(doc));
  const [form, setForm] = useState<DocumentInput>({
    code: doc?.code ?? "",
    docType: doc?.docType ?? "QP",
    clause: doc?.clause ?? "",
    nextReviewDate: doc?.nextReviewDate ?? "",
    title: doc?.title ?? "",
    description: doc?.description ?? "",
    standardId: doc?.standardId ?? "",
    departmentId: doc?.departmentId ?? "",
    ownerId: doc?.ownerId ?? "",
    downloadLimit: String(doc?.downloadLimit ?? 3),
    changeNote: doc?.draft?.changeNote ?? "",
  });
  const [result, setResult] = useState<DocResult>();
  const [pending, startTransition] = useTransition();
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const err = (k: string) => (errors[k] ? t.errors[errors[k]] : undefined);
  const set = (k: keyof DocumentInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const clauseOptions = useMemo(() => {
    const scoped = requirements.filter((r) => !form.standardId || r.standardId === form.standardId);
    const seen = new Set<string>();
    return scoped.filter((r) => {
      const key = `${r.number}::${r.departmentId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [requirements, form.standardId]);

  // New document: note of v1 (required). Edit: note of the pending draft, if there is one.
  const noteLabel = !doc
    ? t.documents.changeNoteFirst
    : doc.draft
      ? t.documents.changeNoteDraft.replace("{n}", String(doc.draft.version))
      : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveDocument(doc?.id, form);
      if (res.ok) {
        toast.success(t.documents.saved);
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
      title={doc ? t.documents.editTitle : t.documents.addTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="document-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="document-form" onSubmit={submit} className="space-y-4" noValidate>
        {result && !result.ok && result.error && (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {t.errors[result.error]}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-[170px_170px_1fr]">
          <Field label={t.documents.code} htmlFor="doc-code" required hint={t.documents.codeHint} error={err("code")}>
            <Input
              id="doc-code"
              value={form.code}
              onChange={(e) => {
                const nextCode = e.target.value;
                setForm((f) => ({
                  ...f,
                  code: nextCode,
                  docType: typeTouched ? f.docType : inferDocumentType(nextCode),
                }));
              }}
              invalid={!!errors.code}
              autoFocus
            />
          </Field>
          <Field label={t.documents.docType} htmlFor="doc-type">
            <Select
              id="doc-type"
              value={form.docType ?? "QP"}
              onChange={(e) => {
                setTypeTouched(true);
                setForm((f) => ({ ...f, docType: e.target.value }));
              }}
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {t.documents.docTypeLabels[dt]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.documents.title} htmlFor="doc-title" required error={err("title")}>
            <Input id="doc-title" value={form.title} onChange={set("title")} invalid={!!errors.title} />
          </Field>
        </div>
        <Field label={t.documents.description} htmlFor="doc-desc">
          <Textarea id="doc-desc" rows={2} value={form.description} onChange={set("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t.requirements.standard} htmlFor="doc-std" required error={err("standardId")}>
            <Select
              id="doc-std"
              value={form.standardId}
              onChange={(e) => setForm((f) => ({ ...f, standardId: e.target.value, clause: "" }))}
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
          <Field label={t.checklist.department} htmlFor="doc-dept" required error={err("departmentId")}>
            <Select id="doc-dept" value={form.departmentId} onChange={set("departmentId")} invalid={!!errors.departmentId}>
              <option value="">{t.checklist.selectDepartment}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {lang === "en" ? d.nameEn : d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.documents.owner} htmlFor="doc-owner" required error={err("ownerId")}>
            <Select id="doc-owner" value={form.ownerId} onChange={set("ownerId")} invalid={!!errors.ownerId}>
              <option value="">{t.requirements.selectOwner}</option>
              {getUsers().map((u) => (
                <option key={u.id} value={u.id}>
                  {displayName(u, lang)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t.documents.clause} htmlFor="doc-clause">
            <Select id="doc-clause" value={form.clause ?? ""} onChange={set("clause")} disabled={!form.standardId}>
              <option value="">{t.documents.clauseOptional}</option>
              {clauseOptions.map((r) => {
                const shortName = r.name.length > 28 ? `${r.name.slice(0, 28)}...` : r.name;
                return (
                  <option key={r.id} value={r.number}>
                    ข้อ {r.number} · {shortName}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field
            label={t.documents.nextReviewDate}
            htmlFor="doc-review-date"
            error={err("nextReviewDate")}
          >
            <Input
              id="doc-review-date"
              type="date"
              value={form.nextReviewDate ?? ""}
              onChange={set("nextReviewDate")}
              invalid={!!errors.nextReviewDate}
            />
          </Field>
          <Field
            label={t.documents.downloadLimit}
            htmlFor="doc-limit"
            required
            hint={t.documents.downloadLimitHint}
            error={err("downloadLimit")}
          >
            <Input
              id="doc-limit"
              inputMode="numeric"
              value={form.downloadLimit}
              onChange={set("downloadLimit")}
              invalid={!!errors.downloadLimit}
            />
          </Field>
        </div>
        {noteLabel && (
          <Field label={noteLabel} htmlFor="doc-note" required={!doc} error={err("changeNote")}>
            <Textarea id="doc-note" rows={2} value={form.changeNote} onChange={set("changeNote")} invalid={!!errors.changeNote} />
          </Field>
        )}
      </form>
    </Modal>
  );
}
