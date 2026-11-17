"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Field, Modal, Select, Textarea, useToast, type BadgeTone } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { riskLevel, riskScore } from "@/lib/risks";
import { updateRiskStatus } from "@/lib/risks/actions";
import type { RiskView } from "@/lib/risks/queries";
import type { RiskLevel, RiskStatus } from "@/lib/types";
import { RISK_STATUS_TONE } from "./RiskStatusDropdown";

const LEVEL_TONE: Record<RiskLevel, BadgeTone> = {
  low: "success",
  medium: "info",
  high: "warning",
  critical: "danger",
};

const LIKELIHOOD_LABELS: Record<number, string> = {
  1: "1 — แทบไม่เกิด",
  2: "2 — นาน ๆ ครั้ง",
  3: "3 — เกิดบางครั้ง",
  4: "4 — เกิดบ่อย",
  5: "5 — เกิดเป็นประจำ",
};

const IMPACT_LABELS: Record<number, string> = {
  1: "1 — เล็กน้อยมาก",
  2: "2 — น้อย",
  3: "3 — ปานกลาง",
  4: "4 — มาก",
  5: "5 — ร้ายแรง / วิกฤต",
};

export function RiskReviewModal({
  risk,
  targetStatus,
  onClose,
}: {
  risk: RiskView;
  targetStatus: "monitored" | "closed";
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [mitigationPlan, setMitigationPlan] = useState(risk.mitigationPlan ?? "");
  const [likelihood, setLikelihood] = useState(risk.residualLikelihood ?? risk.likelihood);
  const [impact, setImpact] = useState(risk.residualImpact ?? risk.impact);
  const [reviewNote, setReviewNote] = useState("");
  const [mitigationError, setMitigationError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const prevScore = risk.initialScore;
  const nextScore = riskScore(likelihood, impact);
  const nextLevel = riskLevel(nextScore);
  const isClosing = targetStatus === "closed";
  const scoreTooHighToClose = isClosing && nextScore >= 10;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mitigationPlan.trim()) {
      setMitigationError("กรุณาระบุมาตรการหรือการดำเนินการก่อนเปลี่ยนสถานะ");
      return;
    }
    setMitigationError(null);
    if (scoreTooHighToClose) return;

    startTransition(async () => {
      const res = await updateRiskStatus(risk.id, targetStatus as RiskStatus, {
        mitigationPlan: mitigationPlan.trim(),
        likelihood,
        impact,
        reviewNote: reviewNote.trim() || undefined,
      });
      if (!res.ok) {
        if (res.error === "invalidTransition") {
          toast.error("ต้องเปลี่ยนเป็น กำลังแก้ไข หรือ ติดตามผล ก่อนปิดเรื่อง");
        } else if (res.error === "mitigationRequired") {
          setMitigationError("กรุณาระบุมาตรการหรือการดำเนินการก่อนเปลี่ยนสถานะ");
        } else if (res.error === "scoreTooHighToClose") {
          toast.error("คะแนนความเสี่ยงยังสูง/วิกฤต (10 ขึ้นไป) ยังไม่สามารถปิดเรื่องได้");
        } else if (res.error === "forbidden" || res.error === "notFound") {
          toast.error(t.errors[res.error]);
        } else {
          toast.error(t.errors.forbidden);
        }
        return;
      }
      toast.success(
        isClosing
          ? `ตรวจยืนยันและปิดเรื่อง ${risk.code} เรียบร้อยแล้ว`
          : `ส่งผลการแก้ไข ${risk.code} (สถานะ: ติดตามผล) เรียบร้อยแล้ว`,
      );
      onClose();
    });
  }

  function handleRejectToMitigating() {
    if (!reviewNote.trim()) {
      setNoteError("กรุณาระบุเหตุผลหรือสิ่งที่ต้องแก้ไขเพิ่มเติมในช่องหมายเหตุก่อนกดตีกลับ");
      return;
    }
    setNoteError(null);
    startTransition(async () => {
      const res = await updateRiskStatus(risk.id, "mitigating", {
        reviewNote: `[ตีกลับแก้ไข] ${reviewNote.trim()}`,
      });
      if (!res.ok) {
        toast.error(t.errors.forbidden);
        return;
      }
      toast.success(`ส่งกลับ ${risk.code} ให้แผนกแก้ไขเพิ่มเติม (สถานะ: กำลังแก้ไข)`);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      size="lg"
      title={isClosing ? `ตรวจยืนยันผลและปิดความเสี่ยง (${risk.code})` : `ส่งผลการแก้ไขและประเมินความเสี่ยงหลังแก้ (${risk.code})`}
      closeLabel={t.common.close}
      footer={
        <>
          {isClosing && (
            <Button variant="danger" className="mr-auto" onClick={handleRejectToMitigating} disabled={pending}>
              ตีกลับให้แก้ไขใหม่
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="risk-review-form" disabled={pending || scoreTooHighToClose}>
            {pending ? t.common.saving : isClosing ? "อนุมัติปิดเรื่อง" : "ส่งผลแก้ไข"}
          </Button>
        </>
      }
    >
      <form id="risk-review-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-control border border-border bg-page px-3.5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text">{risk.title}</span>
            <Badge tone={RISK_STATUS_TONE[targetStatus]}>{t.riskStatus[targetStatus]}</Badge>
          </div>
          <p className="mt-1 text-xs text-text-muted">{t.riskStatusDesc[targetStatus]}</p>
        </div>

        <Field
          htmlFor="review-mitigation"
          label="มาตรการลดความเสี่ยง / สิ่งที่ดำเนินการแล้ว"
          required
          error={mitigationError ?? undefined}
        >
          <Textarea
            id="review-mitigation"
            rows={2}
            value={mitigationPlan}
            onChange={(e) => {
              setMitigationPlan(e.target.value);
              if (mitigationError) setMitigationError(null);
            }}
            placeholder="ระบุมาตรการที่ได้ดำเนินการไป เพื่อเป็นหลักฐานตามข้อกำหนด ISO..."
            invalid={!!mitigationError}
            autoFocus
          />
        </Field>

        <div className="rounded-control border border-border bg-page p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-text">ประเมินความเสี่ยงคงเหลือหลังแก้ไข (Residual Risk)</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted">
                ตั้งต้น {prevScore} ({risk.likelihood}×{risk.impact}) → หลังแก้ไข <strong className="text-text">{nextScore}</strong> ({likelihood}×{impact})
              </span>
              <Badge tone={LEVEL_TONE[nextLevel]}>{t.riskLevel[nextLevel]}</Badge>
              {nextScore < prevScore && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  ลดลง {prevScore - nextScore} คะแนน
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field htmlFor="review-l" label={t.risks.likelihood}>
              <Select
                id="review-l"
                value={String(likelihood)}
                onChange={(e) => setLikelihood(Number(e.target.value))}
                className="bg-surface"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {LIKELIHOOD_LABELS[n]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="review-i" label={t.risks.impact}>
              <Select
                id="review-i"
                value={String(impact)}
                onChange={(e) => setImpact(Number(e.target.value))}
                className="bg-surface"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {IMPACT_LABELS[n]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {scoreTooHighToClose && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              คะแนนความเสี่ยงใหม่ยังอยู่ระดับ <strong>สูง / วิกฤต ({nextScore} คะแนน)</strong> จึงยังไม่สามารถปิดเรื่องได้ — กรุณาลดคะแนนให้ต่ำกว่า 10 ก่อน หรือเปลี่ยนเป็นสถานะ <strong>ติดตามผล</strong> แทน
            </div>
          )}
        </div>

        {risk.reviewNote && (
          <div className="rounded-control border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            <span className="font-bold">หมายเหตุล่าสุด: </span>
            <span>{risk.reviewNote}</span>
          </div>
        )}

        <Field
          htmlFor="review-note"
          label={
            isClosing ? (
              <>
                หมายเหตุจากผู้ตรวจ / เหตุผลในการตีกลับ{" "}
                <span className="text-danger">(จำเป็นต้องกรอกหากกดตีกลับ)</span>
              </>
            ) : (
              "หมายเหตุการส่งผลแก้ไข (ไม่บังคับ)"
            )
          }
          error={noteError ?? undefined}
        >
          <Textarea
            id="review-note"
            rows={2}
            value={reviewNote}
            onChange={(e) => {
              setReviewNote(e.target.value);
              if (noteError) setNoteError(null);
            }}
            invalid={!!noteError}
            placeholder={
              isClosing
                ? "ระบุผลการตรวจยืนยัน หรือระบุเหตุผลที่ตีกลับให้แผนกแก้ไขใหม่..."
                : "เช่น ติดตั้งมาตรการแล้วและตรวจเช็กซ้ำครบถ้วน"
            }
          />
        </Field>
      </form>
    </Modal>
  );
}
