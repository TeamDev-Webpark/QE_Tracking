"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge, Button, Field, Input, Modal, Select, Textarea, useToast, type BadgeTone } from "@/components/ui";
import { RequirementSelect } from "@/components/standards/RequirementSelect";
import { useI18n } from "@/components/providers/I18nProvider";
import { departments } from "@/data/departments";
import { cn } from "@/lib/cn";
import { departmentName } from "@/lib/format";
import { todayInBangkok } from "@/lib/nc";
import { riskLevel, riskScore } from "@/lib/risks";
import { saveRisk } from "@/lib/risks/actions";
import type { RiskRequirementOption, RiskView } from "@/lib/risks/queries";
import type { FieldError } from "@/lib/standards/actions";
import type { RiskLevel, RiskStatus } from "@/lib/types";
import { RiskStatusDropdown } from "./RiskStatusDropdown";

const LEVEL_TONE: Record<RiskLevel, BadgeTone> = {
  low: "success",
  medium: "info",
  high: "warning",
  critical: "danger",
};

const CELL_STYLE: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
  medium: "bg-sky-100 text-sky-900 hover:bg-sky-200",
  high: "bg-amber-100 text-amber-900 hover:bg-amber-200",
  critical: "bg-rose-100 text-rose-900 hover:bg-rose-200",
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

export function RiskFormModal({
  open,
  risk,
  standards,
  owners,
  requirements,
  nextCode,
  onClose,
}: {
  open: boolean;
  risk: RiskView | null;
  standards: { id: string; label: string }[];
  owners: { id: string; name: string; departmentId: string }[];
  requirements: RiskRequirementOption[];
  nextCode: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <RiskFormInner
      key={risk?.id ?? "new"}
      risk={risk}
      standards={standards}
      owners={owners}
      requirements={requirements}
      nextCode={nextCode}
      onClose={onClose}
    />
  );
}

function RiskFormInner({
  risk,
  standards,
  owners,
  requirements,
  nextCode,
  onClose,
}: {
  risk: RiskView | null;
  standards: { id: string; label: string }[];
  owners: { id: string; name: string; departmentId: string }[];
  requirements: RiskRequirementOption[];
  nextCode: string;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [code, setCode] = useState(risk?.code ?? nextCode);
  const [title, setTitle] = useState(risk?.title ?? "");
  const [description, setDescription] = useState(risk?.description ?? "");
  const [standardId, setStandardId] = useState(risk?.standardId ?? "");
  const [clause, setClause] = useState(risk?.clause ?? "");
  const [selectedReqId, setSelectedReqId] = useState(
    () => requirements.find((r) => r.standardId === risk?.standardId && r.number === risk?.clause)?.id ?? "",
  );
  const [departmentId, setDepartmentId] = useState(risk?.departmentId ?? departments[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState(risk?.ownerId ?? owners[0]?.id ?? "");
  const [likelihood, setLikelihood] = useState(risk?.likelihood ?? 3);
  const [impact, setImpact] = useState(risk?.impact ?? 3);
  const [mitigationPlan, setMitigationPlan] = useState(risk?.mitigationPlan ?? "");
  const [status, setStatus] = useState<RiskStatus>(risk?.status ?? "open");
  const [reviewDate, setReviewDate] = useState(risk?.reviewDate ?? todayInBangkok());
  const [showAdvanced, setShowAdvanced] = useState(Boolean(risk?.standardId || risk?.description));
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError>>({});

  const filteredReqs = useMemo(
    () => requirements.filter((r) => r.standardId === standardId),
    [requirements, standardId],
  );

  const liveScore = riskScore(likelihood, impact);
  const liveLevel = riskLevel(liveScore);
  const scoreTooHighToClose = status === "closed" && liveScore >= 10;
  const err = (k: string) => (fieldErrors[k] ? t.errors[fieldErrors[k]] : undefined);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    if (scoreTooHighToClose) {
      toast.error("คะแนนความเสี่ยงยังสูง/วิกฤต (10 ขึ้นไป) ยังไม่สามารถปิดเรื่องได้");
      return;
    }
    startTransition(async () => {
      const res = await saveRisk(risk?.id ?? null, {
        code,
        title,
        description,
        standardId,
        clause,
        departmentId,
        ownerId,
        likelihood,
        impact,
        mitigationPlan,
        status,
        reviewDate,
      });
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        else if (res.error === "invalidTransition") toast.error("ต้องเปลี่ยนเป็น กำลังแก้ไข หรือ ติดตามผล ก่อนปิดเรื่อง");
        else if (res.error === "mitigationRequired") toast.error("กรุณาระบุมาตรการป้องกันหรือลดความเสี่ยงก่อน");
        else if (res.error === "scoreTooHighToClose") toast.error("คะแนนความเสี่ยงยังสูง/วิกฤต (10 ขึ้นไป) ยังไม่สามารถปิดเรื่องได้");
        else if (res.error) toast.error(t.errors[res.error]);
        return;
      }
      toast.success(t.risks.saved);
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={pending ? () => {} : onClose}
      size="lg"
      title={risk ? t.risks.editTitle : t.risks.addTitle}
      closeLabel={t.common.close}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="risk-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id="risk-form" onSubmit={handleSubmit} className="space-y-4">
        {/* 1. หัวข้อความเสี่ยง */}
        <Field htmlFor="risk-title" label={t.risks.titleField} required error={err("title")}>
          <Input
            id="risk-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น เครื่องวัดอุณหภูมิห้องเย็นคลาดเคลื่อน / พนักงานใช้เอกสารฉบับเก่า"
            invalid={!!fieldErrors.title}
            autoFocus
          />
        </Field>

        {/* 2. แผนก / ผู้รับผิดชอบ / กำหนดทบทวน */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field htmlFor="risk-dept" label={t.risks.department} required error={err("departmentId")}>
            <Select
              id="risk-dept"
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
          <Field htmlFor="risk-owner" label={t.risks.owner} required error={err("ownerId")}>
            <Select
              id="risk-owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              invalid={!!fieldErrors.ownerId}
            >
              {owners.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="risk-review" label={t.risks.reviewDate} required error={err("reviewDate")}>
            <Input
              id="risk-review"
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              invalid={!!fieldErrors.reviewDate}
            />
          </Field>
        </div>

        {/* 3. ประเมินความเสี่ยง (ฝั่งซ้าย: Dropdown + สรุปผล / ฝั่งขวา: เมทริกซ์ 5x5) */}
        <div className="rounded-control border border-border bg-page p-4">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-3">
              <p className="text-xs font-bold text-text">ประเมินระดับความเสี่ยง</p>
              <Field htmlFor="risk-l" label={t.risks.likelihood}>
                <Select
                  id="risk-l"
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
              <Field htmlFor="risk-i" label={t.risks.impact}>
                <Select
                  id="risk-i"
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
              <div className="flex items-center justify-between rounded-control border border-border bg-surface px-3.5 py-2.5">
                <span className="text-xs font-semibold text-text-muted">
                  {t.risks.score}: <strong className="text-sm text-text tabular-nums">{liveScore}</strong> / 25
                </span>
                <Badge tone={LEVEL_TONE[liveLevel]}>{t.riskLevel[liveLevel]}</Badge>
              </div>
            </div>

            <div className="flex flex-col items-center rounded-control border border-border/80 bg-surface p-3">
              <div className="mb-1.5 text-[11px] font-semibold text-text-muted">คลิกเลือกช่อง (โอกาส × ความรุนแรง)</div>
              <div className="inline-grid grid-cols-[auto_repeat(5,2.25rem)] items-center gap-1 text-[11px]">
                <span className="pr-1.5 text-right font-semibold text-text-muted">L\I</span>
                {[1, 2, 3, 4, 5].map((iVal) => (
                  <span key={iVal} className="text-center font-semibold text-text-muted">
                    {iVal}
                  </span>
                ))}
                {[5, 4, 3, 2, 1].map((lVal) => (
                  <div key={lVal} className="contents">
                    <span className="pr-1.5 text-right font-semibold text-text-muted">{lVal}</span>
                    {[1, 2, 3, 4, 5].map((iVal) => {
                      const s = riskScore(lVal, iVal);
                      const lvl = riskLevel(s);
                      const active = likelihood === lVal && impact === iVal;
                      return (
                        <button
                          key={`${lVal}-${iVal}`}
                          type="button"
                          onClick={() => {
                            setLikelihood(lVal);
                            setImpact(iVal);
                          }}
                          title={`โอกาส ${lVal} × ความรุนแรง ${iVal} = ${s}`}
                          className={cn(
                            "h-7 w-9 rounded text-xs font-bold tabular-nums transition-all cursor-pointer",
                            CELL_STYLE[lvl],
                            active && "ring-2 ring-primary ring-offset-1 scale-105",
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. แผนลดความเสี่ยง & สถานะ */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field
              htmlFor="risk-plan"
              label={t.risks.mitigationPlan}
              required={status === "monitored" || status === "closed"}
              error={err("mitigationPlan")}
            >
              <Textarea
                id="risk-plan"
                rows={2}
                value={mitigationPlan}
                onChange={(e) => setMitigationPlan(e.target.value)}
                placeholder="ระบุมาตรการป้องกันหรือลดความเสี่ยง..."
                invalid={!!fieldErrors.mitigationPlan}
              />
            </Field>
          </div>
          <Field htmlFor="risk-status" label={t.risks.status} hint={t.riskStatusDesc[status]}>
            <RiskStatusDropdown
              id="risk-status"
              value={status}
              onChange={setStatus}
              fullWidth
              disabledStatuses={risk?.status === "open" ? ["closed"] : []}
              disabledReason="ต้องเปลี่ยนเป็น กำลังแก้ไข หรือ ติดตามผล ก่อนปิดเรื่อง"
              ariaLabel={t.risks.status}
            />
          </Field>
        </div>

        {scoreTooHighToClose && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            คะแนนความเสี่ยงยังอยู่ระดับ <strong>สูง / วิกฤต ({liveScore} คะแนน)</strong> จึงยังไม่สามารถเลือกสถานะ <strong>ปิดเรื่องแล้ว</strong> ได้ — กรุณาลดคะแนนให้ต่ำกว่า 10 ก่อน หรือเลือกเป็น <strong>ติดตามผล</strong> แทน
          </div>
        )}

        {/* 5. ข้อมูลเพิ่มเติม (พับได้เพื่อไม่ให้รกตา) */}
        <div className="border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            {showAdvanced ? "▾ ซ่อนข้อมูลอ้างอิงเพิ่มเติม" : "▸ เพิ่มรายละเอียด / ผูกข้อกำหนด ISO / กำหนดรหัสเอง"}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field htmlFor="risk-code" label={t.risks.code} hint={t.risks.codeHint} error={err("code")}>
                  <Input id="risk-code" value={code} onChange={(e) => setCode(e.target.value)} invalid={!!fieldErrors.code} />
                </Field>
                <Field htmlFor="risk-std" label={t.risks.standard}>
                  <Select
                    id="risk-std"
                    value={standardId}
                    onChange={(e) => {
                      setStandardId(e.target.value);
                      setClause("");
                      setSelectedReqId("");
                    }}
                  >
                    <option value="">{t.risks.noStandard}</option>
                    {standards.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {standardId && (
                <Field htmlFor="risk-clause" label={t.risks.clause}>
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

              <Field htmlFor="risk-desc" label={t.risks.description}>
                <Textarea id="risk-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
