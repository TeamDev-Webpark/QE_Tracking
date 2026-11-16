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
  const [likelihood, setLikelihood] = useState(risk.likelihood);
  const [impact, setImpact] = useState(risk.impact);
  const [reviewNote, setReviewNote] = useState("");
  const [mitigationError, setMitigationError] = useState<string | null>(null);

  const prevScore = risk.score;
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
          ? `ปิดเรื่อง ${risk.code} เรียบร้อยแล้ว`
          : `อัปเดต ${risk.code} เป็น "ติดตามผล" เรียบร้อยแล้ว`,
      );
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      size="lg"
      title={isClosing ? `ทบทวนและปิดความเสี่ยง (${risk.code})` : `บันทึกมาตรการเพื่อติดตามผล (${risk.code})`}
      closeLabel={t.common.close}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="risk-review-form" disabled={pending || scoreTooHighToClose}>
            {pending ? t.common.saving : isClosing ? "ยืนยันปิดเรื่อง" : "บันทึกและติดตามผล"}
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
            <span className="text-xs font-bold text-text">ทบทวนคะแนนความเสี่ยงหลังแก้ไข</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted">
                เดิม {prevScore} → ใหม่ <strong className="text-text">{nextScore}</strong>
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

        <Field htmlFor="review-note" label="สรุปผลการทบทวน / เหตุผลเพิ่มเติม (ไม่บังคับ)">
          <Textarea
            id="review-note"
            rows={2}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder={
              isClosing
                ? "เช่น ทดสอบระบบและติดตามผลครบ 30 วันแล้ว ไม่พบปัญหาซ้ำ"
                : "เช่น ติดตั้งมาตรการแล้ว รอติดตามผลอีก 1 เดือน"
            }
          />
        </Field>
      </form>
    </Modal>
  );
}
