"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
  type BadgeTone,
} from "@/components/ui";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { departmentName, formatDate } from "@/lib/format";
import { deleteAuditFinding, saveAuditFinding, updateAuditStatus } from "@/lib/audits/actions";
import type { AuditFinding, FindingResult, InternalAuditStatus, Nonconformity } from "@/lib/types";

type AuditDetailType = {
  id: string;
  code: string;
  title: string;
  standardId: string;
  standardLabel: string;
  departmentId: string;
  leadAuditorName: string;
  scheduledDate: string;
  completedDate?: string;
  scope: string;
  status: InternalAuditStatus;
  summary?: string;
  findings: (AuditFinding & { linkedNc?: Nonconformity })[];
};

const RESULT_TONE: Record<FindingResult, BadgeTone> = {
  conforming: "success",
  observation: "warning",
  nonconforming: "danger",
  pending: "neutral",
};

const RESULT_LABEL: Record<FindingResult, string> = {
  conforming: "ถูกต้องตามข้อกำหนด (ผ่าน)",
  observation: "ข้อสังเกต (เฝ้าระวัง)",
  nonconforming: "พบข้อบกพร่อง (NC)",
  pending: "รอตรวจ",
};

export function AuditDetailView({
  audit,
  requirements,
}: {
  audit: AuditDetailType;
  requirements: { id: string; number: string; name: string }[];
}) {
  const { lang } = useI18n();
  const toast = useToast();
  const user = useSessionUser();
  const canManage = user.role === "admin" || user.role === "qe" || user.role === "iso";

  const [modalFinding, setModalFinding] = useState<AuditFinding | null | undefined>(undefined);
  const [deletingFinding, setDeletingFinding] = useState<AuditFinding | null>(null);
  const [completeSummary, setCompleteSummary] = useState(audit.summary ?? "");
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const [pending, startTransition] = useTransition();

  function handleStartAudit() {
    startTransition(async () => {
      const res = await updateAuditStatus(audit.id, "in_progress");
      if (!res.ok) {
        toast.error("ไม่สามารถเริ่มการตรวจได้");
        return;
      }
      toast.success("เริ่มการตรวจประเมินแล้ว");
    });
  }

  function handleCompleteAudit() {
    startTransition(async () => {
      const res = await updateAuditStatus(audit.id, "completed", completeSummary);
      setShowCompleteModal(false);
      if (!res.ok) {
        toast.error("ไม่สามารถบันทึกสรุปผลตรวจได้");
        return;
      }
      toast.success("บันทึกเสร็จสิ้นการตรวจประเมินเรียบร้อยแล้ว");
    });
  }

  function handleDeleteFinding() {
    if (!deletingFinding) return;
    startTransition(async () => {
      const res = await deleteAuditFinding(audit.id, deletingFinding.id);
      setDeletingFinding(null);
      if (!res.ok) {
        toast.error("ไม่สามารถลบรายการได้");
        return;
      }
      toast.success("ลบรายการตรวจเรียบร้อยแล้ว");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/audits"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" /> กลับหน้ารายการแผนตรวจ
        </Link>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {audit.status === "planned" && (
              <Button onClick={handleStartAudit} disabled={pending}>
                เริ่มดำเนินการตรวจ (In Progress)
              </Button>
            )}
            {audit.status === "in_progress" && (
              <Button onClick={() => setShowCompleteModal(true)} disabled={pending}>
                เสร็จสิ้นการตรวจ (Complete)
              </Button>
            )}
          </div>
        )}
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary">{audit.code}</span>
              <Badge tone="purple">{audit.standardLabel}</Badge>
              <Badge tone={audit.status === "completed" ? "success" : audit.status === "in_progress" ? "warning" : "neutral"}>
                {audit.status === "completed" ? "ตรวจเสร็จแล้ว" : audit.status === "in_progress" ? "กำลังตรวจ" : "วางแผนไว้"}
              </Badge>
            </div>
            <h1 className="mt-1 text-xl font-bold text-text">{audit.title}</h1>
          </div>
        </div>

        <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-3 text-xs">
          <div>
            <span className="text-text-muted">แผนกที่รับการตรวจ:</span>
            <p className="font-semibold text-text">{departmentName(audit.departmentId, lang)}</p>
          </div>
          <div>
            <span className="text-text-muted">หัวหน้าทีมผู้ตรวจ (Lead Auditor):</span>
            <p className="font-semibold text-text">{audit.leadAuditorName}</p>
          </div>
          <div>
            <span className="text-text-muted">วันที่กำหนดตรวจ:</span>
            <p className="font-semibold text-text">{formatDate(audit.scheduledDate, lang)}</p>
          </div>
        </div>

        {audit.scope && (
          <div className="rounded-control bg-page p-3 text-xs">
            <span className="font-semibold text-text">ขอบเขตการตรวจ:</span> {audit.scope}
          </div>
        )}

        {audit.summary && (
          <div className="rounded-control bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
            <span className="font-semibold">สรุปผลการตรวจ:</span> {audit.summary}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-text">รายการและผลการตรวจประเมิน (Audit Findings)</h2>
            <p className="text-xs text-text-muted">ข้อกำหนดที่สุ่มตรวจ ผลการประเมิน และหลักฐานหน้างาน</p>
          </div>
          {canManage && audit.status !== "completed" && (
            <Button onClick={() => setModalFinding(null)}>
              <PlusIcon className="h-4 w-4" /> เพิ่มหัวข้อตรวจ
            </Button>
          )}
        </div>

        <div className="divide-y divide-border/60">
          {audit.findings.length === 0 ? (
            <p className="py-8 text-center text-xs text-text-muted">ยังไม่มีรายการตรวจ กดปุ่มเพิ่มหัวข้อตรวจได้เลย</p>
          ) : (
            audit.findings.map((f, idx) => (
              <div key={f.id} className="py-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-page text-[11px] font-bold text-text-muted">
                      {idx + 1}
                    </span>
                    <span className="rounded bg-page px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                      ข้อกำหนด {f.clause}
                    </span>
                    <Badge tone={RESULT_TONE[f.result]}>{RESULT_LABEL[f.result]}</Badge>
                  </div>

                  {canManage && audit.status !== "completed" && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setModalFinding(f)}
                        className="rounded-control px-2 py-1 text-xs font-semibold text-primary hover:bg-page cursor-pointer"
                      >
                        แก้ไขผล
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingFinding(f)}
                        className="rounded-control p-1 text-text-muted hover:bg-page hover:text-danger cursor-pointer"
                        title="ลบรายการ"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm font-medium text-text pl-7">{f.question}</p>

                {f.evidence && (
                  <p className="text-xs text-text-muted pl-7">
                    <strong className="text-text">หลักฐานที่พบ:</strong> {f.evidence}
                  </p>
                )}

                {f.linkedNc && (
                  <div className="ml-7 mt-1.5 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-900">
                    <span>ออกใบสั่งแก้ไขแล้ว:</span>
                    <Link
                      href={`/corrective-actions/${f.linkedNc.id}`}
                      className="font-bold underline hover:text-rose-700"
                    >
                      {f.linkedNc.number} — {f.linkedNc.title}
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal บันทึกผลตรวจ */}
      {modalFinding !== undefined && (
        <FindingModal
          auditId={audit.id}
          finding={modalFinding}
          requirements={requirements}
          onClose={() => setModalFinding(undefined)}
        />
      )}

      {/* Modal สรุปปิดการตรวจ */}
      <Modal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        size="md"
        title="สรุปผลและเสร็จสิ้นการตรวจประเมิน"
        closeLabel="ปิด"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCompleteModal(false)} disabled={pending}>
              ยกเลิก
            </Button>
            <Button onClick={handleCompleteAudit} disabled={pending}>
              {pending ? "กำลังบันทึก..." : "ยืนยันเสร็จสิ้นการตรวจ"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field htmlFor="audit-summary-text" label="ข้อความสรุปผลการตรวจประเมินภาพรวม">
            <Textarea
              id="audit-summary-text"
              rows={4}
              value={completeSummary}
              onChange={(e) => setCompleteSummary(e.target.value)}
              placeholder="สรุปผลภาพรวม เช่น ตรวจพบข้อบกพร่อง NC กี่รายการ, แผนกให้ความร่วมมือดี, ข้อเสนอแนะในการปรับปรุง..."
              autoFocus
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingFinding}
        title="ยืนยันการลบรายการตรวจ"
        message="ต้องการลบหัวข้อการตรวจนี้ใช่หรือไม่?"
        confirmLabel="ลบ"
        cancelLabel="ยกเลิก"
        pending={pending}
        onCancel={() => setDeletingFinding(null)}
        onConfirm={handleDeleteFinding}
      />
    </div>
  );
}

function FindingModal({
  auditId,
  finding,
  requirements,
  onClose,
}: {
  auditId: string;
  finding: AuditFinding | null;
  requirements: { id: string; number: string; name: string }[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [clause, setClause] = useState(finding?.clause ?? (requirements[0]?.number || ""));
  const [question, setQuestion] = useState(finding?.question ?? "");
  const [result, setResult] = useState<FindingResult>(finding?.result ?? "conforming");
  const [evidence, setEvidence] = useState(finding?.evidence ?? "");
  const [createNc, setCreateNc] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) {
      toast.error("กรุณาระบุหัวข้อหรือคำถามการตรวจ");
      return;
    }

    startTransition(async () => {
      const res = await saveAuditFinding(auditId, finding?.id ?? null, {
        clause,
        question,
        result,
        evidence,
        createNc: result === "nonconforming" && createNc,
      });
      if (!res.ok) {
        toast.error("ไม่สามารถบันทึกรายการได้");
        return;
      }
      toast.success("บันทึกผลการตรวจเรียบร้อยแล้ว");
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      size="md"
      title={finding ? "แก้ไขผลการตรวจ" : "เพิ่มหัวข้อและผลการตรวจ"}
      closeLabel="ปิด"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            ยกเลิก
          </Button>
          <Button type="submit" form="finding-form" disabled={pending}>
            {pending ? "กำลังบันทึก..." : "บันทึกผลตรวจ"}
          </Button>
        </>
      }
    >
      <form id="finding-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="find-clause" label="ข้อกำหนด ISO">
            <Select
              id="find-clause"
              value={clause}
              onChange={(e) => {
                setClause(e.target.value);
                const req = requirements.find((r) => r.number === e.target.value);
                if (req && !question) setQuestion(`การปฏิบัติตาม ${req.name}`);
              }}
            >
              {requirements.map((r) => (
                <option key={r.id} value={r.number}>
                  {r.number} — {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="find-result" label="ผลการประเมิน">
            <Select id="find-result" value={result} onChange={(e) => setResult(e.target.value as FindingResult)}>
              <option value="conforming">ถูกต้องตามข้อกำหนด (ผ่าน)</option>
              <option value="observation">ข้อสังเกต (เฝ้าระวัง)</option>
              <option value="nonconforming">พบข้อบกพร่อง (พบ NC)</option>
              <option value="pending">รอตรวจ</option>
            </Select>
          </Field>
        </div>

        <Field htmlFor="find-q" label="ประเด็น / คำถามการตรวจ" required>
          <Input
            id="find-q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="เช่น การจัดเก็บสารเคมีและการป้องกันการรั่วไหล..."
            autoFocus
          />
        </Field>

        <Field htmlFor="find-ev" label="หลักฐานที่พบหน้างาน (Evidence / สภาพความเป็นจริง)">
          <Textarea
            id="find-ev"
            rows={3}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="ระบุสิ่งที่พบ เช่น พนักงานปฏิบัติตามคู่มือถูกต้อง หรือ พบสารเคมีรั่วไหลไม่มีถาดรองรับ..."
          />
        </Field>

        {result === "nonconforming" && !finding?.ncId && (
          <div className="rounded-control border border-rose-200 bg-rose-50 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-rose-900">
              <input
                type="checkbox"
                checked={createNc}
                onChange={(e) => setCreateNc(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-primary"
              />
              <span>ส่งต่อเพื่อสร้างใบสั่งแก้ไข (ออกใบ NC / CAR) เข้าสู่ระบบอัตโนมัติ</span>
            </label>
          </div>
        )}
      </form>
    </Modal>
  );
}
