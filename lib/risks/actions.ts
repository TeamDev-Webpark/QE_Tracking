"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { getUserById } from "@/data";
import { departments } from "@/data/departments";
import { auditEntry, diffFields } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { readDb, updateDb } from "@/lib/db";
import { nextRiskCode } from "@/lib/risks";
import type { FieldError } from "@/lib/standards/actions";
import type { RiskStatus } from "@/lib/types";

export type RiskError =
  | "forbidden"
  | "notFound"
  | "invalidTransition"
  | "mitigationRequired"
  | "scoreTooHighToClose";
export type RiskResult =
  | { ok: true; id?: string }
  | { ok: false; error?: RiskError; fieldErrors?: Record<string, FieldError> };

export type RiskStatusReview = {
  mitigationPlan?: string;
  likelihood?: number;
  impact?: number;
  reviewNote?: string;
};

const STATUSES: RiskStatus[] = ["open", "mitigating", "monitored", "closed"];
const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");
const isValidYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export type SaveRiskInput = {
  code?: string;
  title: string;
  description: string;
  standardId: string;
  clause: string;
  departmentId: string;
  ownerId: string;
  likelihood: number;
  impact: number;
  mitigationPlan: string;
  status: RiskStatus;
  reviewDate: string;
};

export async function saveRisk(id: string | null, input: SaveRiskInput): Promise<RiskResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };

  const db = await readDb();
  const existing = id ? db.risks.find((r) => r.id === id) : undefined;
  if (id && !existing) return { ok: false, error: "notFound" };

  const rawCode = clean(input.code);
  const code = rawCode || existing?.code || nextRiskCode(db.risks.map((r) => r.code));
  const likelihood = Math.min(5, Math.max(1, Math.round(Number(input.likelihood) || 1)));
  const impact = Math.min(5, Math.max(1, Math.round(Number(input.impact) || 1)));

  const data = {
    code,
    title: clean(input.title),
    description: clean(input.description),
    standardId: clean(input.standardId),
    clause: clean(input.clause),
    departmentId: clean(input.departmentId),
    ownerId: clean(input.ownerId),
    likelihood,
    impact,
    mitigationPlan: clean(input.mitigationPlan),
    status: STATUSES.includes(input.status) ? input.status : "open",
    reviewDate: clean(input.reviewDate),
  };

  const fieldErrors: Record<string, FieldError> = {};
  if (!data.title) fieldErrors.title = "required";
  if (!departments.some((d) => d.id === data.departmentId)) fieldErrors.departmentId = "required";
  if (!getUserById(data.ownerId)) fieldErrors.ownerId = "required";
  if (!isValidYmd(data.reviewDate)) fieldErrors.reviewDate = "required";
  if (db.risks.some((r) => r.id !== id && r.code.toLowerCase() === data.code.toLowerCase())) {
    fieldErrors.code = "duplicate";
  }
  if ((data.status === "monitored" || data.status === "closed") && !data.mitigationPlan) {
    fieldErrors.mitigationPlan = "required";
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  if (existing?.status === "open" && data.status === "closed") {
    return { ok: false, error: "invalidTransition" };
  }
  if (data.status === "closed" && data.likelihood * data.impact >= 10) {
    return { ok: false, error: "scoreTooHighToClose" };
  }

  const targetId = id ?? randomUUID();
  const now = new Date().toISOString();

  await updateDb((draft) => {
    if (id) {
      const target = draft.risks.find((r) => r.id === id);
      if (!target) return;
      const changes = diffFields(target, data, [
        "code",
        "title",
        "departmentId",
        "ownerId",
        "likelihood",
        "impact",
        "mitigationPlan",
        "status",
        "reviewDate",
      ]);
      Object.assign(target, data, { updatedAt: now, updatedBy: user.id });
      if (changes.length) {
        draft.auditLog.push(
          auditEntry(user, "update", { type: "risk", id: target.id, label: target.code }, { changes }),
        );
      }
      return;
    }

    draft.risks.push({
      id: targetId,
      ...data,
      updatedAt: now,
      updatedBy: user.id,
    });
    draft.auditLog.push(
      auditEntry(
        user,
        "create",
        { type: "risk", id: targetId, label: data.code },
        {
          changes: diffFields(undefined, data, ["code", "title", "departmentId", "likelihood", "impact", "status"]),
        },
      ),
    );
  });

  refresh();
  return { ok: true, id: targetId };
}

export async function updateRiskStatus(
  id: string,
  status: RiskStatus,
  review?: RiskStatusReview,
): Promise<RiskResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };
  if (!STATUSES.includes(status)) return { ok: false, error: "notFound" };

  let error: RiskError | null = null;
  const now = new Date().toISOString();
  await updateDb((draft) => {
    const target = draft.risks.find((r) => r.id === id);
    if (!target) {
      error = "notFound";
      return;
    }
    if (target.status === status && !review) return;
    if (target.status === "open" && status === "closed") {
      error = "invalidTransition";
      return;
    }

    const nextMitigation =
      review?.mitigationPlan !== undefined ? clean(review.mitigationPlan) : target.mitigationPlan;

    if ((status === "monitored" || status === "closed") && !nextMitigation) {
      error = "mitigationRequired";
      return;
    }

    const nextLikelihood =
      review?.likelihood !== undefined
        ? Math.min(5, Math.max(1, Math.round(Number(review.likelihood) || target.likelihood)))
        : target.likelihood;
    const nextImpact =
      review?.impact !== undefined
        ? Math.min(5, Math.max(1, Math.round(Number(review.impact) || target.impact)))
        : target.impact;

    if (status === "closed" && nextLikelihood * nextImpact >= 10) {
      error = "scoreTooHighToClose";
      return;
    }

    const changes = diffFields(
      target,
      {
        status,
        mitigationPlan: nextMitigation,
        likelihood: nextLikelihood,
        impact: nextImpact,
      },
      ["status", "mitigationPlan", "likelihood", "impact"],
    );

    const reviewNote = clean(review?.reviewNote);
    if (reviewNote) {
      changes.push({ field: "reviewNote", from: "", to: reviewNote });
    }

    target.status = status;
    target.mitigationPlan = nextMitigation;
    target.likelihood = nextLikelihood;
    target.impact = nextImpact;
    target.updatedAt = now;
    target.updatedBy = user.id;

    if (changes.length) {
      draft.auditLog.push(
        auditEntry(user, "update", { type: "risk", id: target.id, label: target.code }, { changes }),
      );
    }
  });
  if (error) return { ok: false, error };

  refresh();
  return { ok: true };
}

export async function deleteRisk(id: string): Promise<RiskResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) return { ok: false, error: "forbidden" };

  let deleted = false;
  await updateDb((draft) => {
    const idx = draft.risks.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const [removed] = draft.risks.splice(idx, 1);
    deleted = true;
    draft.auditLog.push(auditEntry(user, "delete", { type: "risk", id: removed.id, label: removed.code }));
  });
  if (!deleted) return { ok: false, error: "notFound" };

  refresh();
  return { ok: true };
}
