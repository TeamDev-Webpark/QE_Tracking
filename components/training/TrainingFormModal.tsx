"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { RequirementSelect } from "@/components/standards/RequirementSelect";
import { useI18n } from "@/components/providers/I18nProvider";
import { departments } from "@/data/departments";
import { departmentName } from "@/lib/format";
import { todayInBangkok } from "@/lib/nc";
import { saveTraining, type TrainingFieldError } from "@/lib/training/actions";
import type { TrainingRequirementOption, TrainingView } from "@/lib/training/queries";
import type { TrainingStatus } from "@/lib/types";

export function TrainingFormModal({
  open,
  record,
  standards,
  users,
  requirements,
  nextCode,
  onClose,
}: {
  open: boolean;
  record: TrainingView | null;
  standards: { id: string; label: string }[];
  users: { id: string; name: string; departmentId: string }[];
  requirements: TrainingRequirementOption[];
  nextCode: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <TrainingFormInner
      key={record?.id ?? "new"}
      record={record}
      standards={standards}
      users={users}
      requirements={requirements}
      nextCode={nextCode}
      onClose={onClose}
    />
  );
}

function TrainingFormInner({
  record,
  standards,
  users,
  requirements,
  nextCode,
  onClose,
}: {
  record: TrainingView | null;
  standards: { id: string; label: string }[];
  users: { id: string; name: string; departmentId: string }[];
  requirements: TrainingRequirementOption[];
  nextCode: string;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [code, setCode] = useState(record?.code ?? nextCode);
  const [title, setTitle] = useState(record?.title ?? "");
  const [userId, setUserId] = useState(record?.userId ?? users[0]?.id ?? "");
  const [departmentId, setDepartmentId] = useState(record?.departmentId ?? users[0]?.departmentId ?? departments[0]?.id ?? "");
  const [standardId, setStandardId] = useState(record?.standardId ?? "");
  const [clause, setClause] = useState(record?.clause ?? "");
  const [selectedReqId, setSelectedReqId] = useState(
    () => requirements.find((r) => r.standardId === record?.standardId && r.number === record?.clause)?.id ?? "",
  );
  const [trainer, setTrainer] = useState(record?.trainer ?? "");
  const [status, setStatus] = useState<TrainingStatus>(record?.status ?? "planned");
  const [completedDate, setCompletedDate] = useState(record?.completedDate ?? todayInBangkok());
  const [expiryDate, setExpiryDate] = useState(record?.expiryDate ?? "");
  const [score, setScore] = useState(record?.score !== undefined ? String(record.score) : "");
  const [passed, setPassed] = useState(record?.passed ?? true);
  const [note, setNote] = useState(record?.note ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, TrainingFieldError>>({});

  const filteredReqs = useMemo(
    () => requirements.filter((r) => r.standardId === standardId),
    [requirements, standardId],
  );

  const err = (k: string) => (fieldErrors[k] ? t.errors[fieldErrors[k]] : undefined);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveTraining(record?.id ?? null, {
        code,
        title,
        userId,
        departmentId,
        standardId,
        clause,
        trainer,
        status,
        completedDate,
        expiryDate,
        score,
        passed,
        note,
      });
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        else if (res.error) toast.error(t.errors[res.error]);
        return;
      }
      toast.success(t.training.saved);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      size="lg"
      title={record ? t.training.editTitle : t.training.addTitle}
      closeLabel={t.common.close}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="training-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="training-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="trn-code" label={t.training.code} hint={t.training.codeHint} error={err("code")}>
            <Input id="trn-code" value={code} onChange={(e) => setCode(e.target.value)} invalid={!!fieldErrors.code} />
          </Field>
          <Field htmlFor="trn-status" label={t.training.status}>
            <Select id="trn-status" value={status} onChange={(e) => setStatus(e.target.value as TrainingStatus)}>
              <option value="planned">{t.trainingStatus.planned}</option>
              <option value="completed">{t.trainingStatus.completed}</option>
            </Select>
          </Field>
        </div>

        <Field htmlFor="trn-title" label={t.training.titleField} required error={err("title")}>
          <Input id="trn-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={!!fieldErrors.title} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field htmlFor="trn-user" label={t.training.employee} required error={err("userId")}>
            <Select
              id="trn-user"
              value={userId}
              onChange={(e) => {
                const nextId = e.target.value;
                setUserId(nextId);
                const found = users.find((u) => u.id === nextId);
                if (found) setDepartmentId(found.departmentId);
              }}
              invalid={!!fieldErrors.userId}
            >
              <option value="">{t.training.selectEmployee}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="trn-dept" label={t.training.department} required error={err("departmentId")}>
            <Select
              id="trn-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              invalid={!!fieldErrors.departmentId}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {departmentName(d.id, lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="trn-trainer" label={t.training.trainer} required error={err("trainer")}>
            <Input
              id="trn-trainer"
              value={trainer}
              onChange={(e) => setTrainer(e.target.value)}
              invalid={!!fieldErrors.trainer}
            />
          </Field>
        </div>

        {status === "completed" && (
          <div className="grid gap-4 rounded-control border border-border bg-page p-4 sm:grid-cols-4 items-end">
            <Field htmlFor="trn-completed" label={t.training.completedDate} required error={err("completedDate")}>
              <Input
                id="trn-completed"
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                invalid={!!fieldErrors.completedDate}
                className="bg-surface"
              />
            </Field>
            <Field htmlFor="trn-expiry" label={t.training.expiryDate} error={err("expiryDate")}>
              <Input
                id="trn-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                invalid={!!fieldErrors.expiryDate}
                className="bg-surface"
              />
            </Field>
            <Field htmlFor="trn-score" label={t.training.score} error={err("score")}>
              <Input
                id="trn-score"
                inputMode="numeric"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="0–100"
                invalid={!!fieldErrors.score}
                className="bg-surface"
              />
            </Field>
            <label className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2.5 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={passed}
                onChange={(e) => setPassed(e.target.checked)}
                className="size-4 accent-primary"
              />
              <span>{passed ? t.training.passed : t.training.notPassed}</span>
            </label>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="trn-std" label={t.training.standard}>
            <Select
              id="trn-std"
              value={standardId}
              onChange={(e) => {
                setStandardId(e.target.value);
                setClause("");
                setSelectedReqId("");
              }}
            >
              <option value="">{t.training.noStandard}</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <div />
        </div>

        {standardId && (
          <Field htmlFor="trn-clause" label={t.training.clause}>
            <RequirementSelect
              key={`${standardId}:${departmentId}`}
              requirements={filteredReqs}
              value={selectedReqId}
              departmentFilter={departmentId || undefined}
              onSelect={(req) => {
                setSelectedReqId(req.id);
                setClause(req.number);
              }}
            />
          </Field>
        )}

        <Field htmlFor="trn-note" label={t.training.note}>
          <Textarea id="trn-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
