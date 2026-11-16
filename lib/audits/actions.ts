"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { auditEntry, diffFields } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { readDb, updateDb } from "@/lib/db";
import { nextAuditCode } from "@/lib/audits";
import { nextNumber, todayInBangkok } from "@/lib/nc";
import type { FieldError } from "@/lib/standards/actions";
import type { FindingResult, InternalAudit, InternalAuditStatus } from "@/lib/types";

export type AuditError = "forbidden" | "notFound" | "invalidState";
export type AuditResult =
  | { ok: true; id?: string }
  | { ok: false; error?: AuditError; fieldErrors?: Record<string, FieldError> };

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

export type SaveAuditPlanInput = {
  code?: string;
  title: string;
  standardId: string;
  departmentId: string;
  leadAuditorId: string;
  scheduledDate: string;
  scope: string;
};

export async function saveAuditPlan(id: string | null, input: SaveAuditPlanInput): Promise<AuditResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe" && user.role !== "iso")) {
    return { ok: false, error: "forbidden" };
  }

  const db = await readDb();
  const existing = id ? db.audits.find((a) => a.id === id) : undefined;
  if (id && !existing) return { ok: false, error: "notFound" };

  const code = clean(input.code) || existing?.code || nextAuditCode(db.audits.map((a) => a.code));
  const data = {
    code,
    title: clean(input.title),
    standardId: clean(input.standardId),
    departmentId: clean(input.departmentId),
    leadAuditorId: clean(input.leadAuditorId),
    scheduledDate: clean(input.scheduledDate),
    scope: clean(input.scope),
  };

  const fieldErrors: Record<string, FieldError> = {};
  if (!data.title) fieldErrors.title = "required";
  if (!data.standardId) fieldErrors.standardId = "required";
  if (!data.departmentId) fieldErrors.departmentId = "required";
  if (!data.leadAuditorId) fieldErrors.leadAuditorId = "required";
  if (!data.scheduledDate) fieldErrors.scheduledDate = "required";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const now = new Date().toISOString();
  const targetId = id ?? randomUUID();

  await updateDb((draft) => {
    if (id) {
      const target = draft.audits.find((a) => a.id === id);
      if (!target) return;
      const changes = diffFields(target, data, ["title", "standardId", "departmentId", "leadAuditorId", "scheduledDate", "scope"]);
      Object.assign(target, data, { updatedAt: now, updatedBy: user.id });
      if (changes.length) {
        draft.auditLog.push(
          auditEntry(user, "update", { type: "audit", id: target.id, label: target.code }, { changes }),
        );
      }
      return;
    }

    const newAudit: InternalAudit = {
      id: targetId,
      ...data,
      status: "planned",
      findings: [],
      updatedAt: now,
      updatedBy: user.id,
    };
    draft.audits.push(newAudit);
    draft.auditLog.push(
      auditEntry(user, "create", { type: "audit", id: targetId, label: data.code }),
    );
  });

  refresh();
  return { ok: true, id: targetId };
}

export async function updateAuditStatus(id: string, status: InternalAuditStatus, summary?: string): Promise<AuditResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe" && user.role !== "iso")) {
    return { ok: false, error: "forbidden" };
  }

  const now = new Date().toISOString();
  let found = false;

  await updateDb((draft) => {
    const target = draft.audits.find((a) => a.id === id);
    if (!target) return;
    found = true;
    const prev = target.status;
    target.status = status;
    if (summary !== undefined) target.summary = clean(summary);
    if (status === "completed" && !target.completedDate) {
      target.completedDate = todayInBangkok();
    }
    target.updatedAt = now;
    target.updatedBy = user.id;

    draft.auditLog.push(
      auditEntry(
        user,
        "update",
        { type: "audit", id: target.id, label: target.code },
        { changes: [{ field: "status", from: prev, to: status }] },
      ),
    );
  });

  if (!found) return { ok: false, error: "notFound" };
  refresh();
  return { ok: true };
}

export type SaveFindingInput = {
  clause: string;
  question: string;
  result: FindingResult;
  evidence?: string;
  createNc?: boolean; // if true & nonconforming, creates NC
};

export async function saveAuditFinding(
  auditId: string,
  findingId: string | null,
  input: SaveFindingInput,
): Promise<AuditResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe" && user.role !== "iso")) {
    return { ok: false, error: "forbidden" };
  }

  const now = new Date().toISOString();
  let found = false;

  await updateDb((draft) => {
    const audit = draft.audits.find((a) => a.id === auditId);
    if (!audit) return;
    found = true;

    let linkedNcId: string | undefined = undefined;

    // หากพบข้อบกพร่อง (NC) และเลือกให้สร้าง NC เข้าสู่ระบบ
    if (input.result === "nonconforming" && input.createNc) {
      const year = todayInBangkok().slice(0, 4);
      const ncNumber = nextNumber("NC", draft.nonconformities.map((n) => n.number), year);
      const newNcId = randomUUID();
      linkedNcId = newNcId;

      draft.nonconformities.push({
        id: newNcId,
        number: ncNumber,
        title: `[${audit.code}] ${clean(input.question)}`,
        description: clean(input.evidence) || `พบข้อบกพร่องจากการตรวจประเมินภายใน (${audit.code}) ข้อกำหนด ${clean(input.clause)}`,
        standardId: audit.standardId,
        clause: clean(input.clause),
        departmentId: audit.departmentId,
        source: "manual",
        status: "open",
        rootCause: "",
        correctiveAction: "",
        progress: 0,
        events: [{ at: now, by: user.id, type: "created", note: `สร้างอัตโนมัติจากการตรวจ ${audit.code}` }],
        createdAt: now,
        createdBy: user.id,
      });

      draft.auditLog.push(
        auditEntry(user, "create", { type: "nc", id: newNcId, label: ncNumber }),
      );
    }

    if (findingId) {
      const target = audit.findings.find((f) => f.id === findingId);
      if (target) {
        target.clause = clean(input.clause);
        target.question = clean(input.question);
        target.result = input.result;
        target.evidence = clean(input.evidence);
        if (linkedNcId) target.ncId = linkedNcId;
      }
    } else {
      audit.findings.push({
        id: randomUUID(),
        clause: clean(input.clause),
        question: clean(input.question),
        result: input.result,
        evidence: clean(input.evidence),
        ncId: linkedNcId,
      });
    }

    audit.updatedAt = now;
    audit.updatedBy = user.id;
  });

  if (!found) return { ok: false, error: "notFound" };
  refresh();
  return { ok: true };
}

export async function deleteAuditFinding(auditId: string, findingId: string): Promise<AuditResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe" && user.role !== "iso")) {
    return { ok: false, error: "forbidden" };
  }

  let deleted = false;
  await updateDb((draft) => {
    const audit = draft.audits.find((a) => a.id === auditId);
    if (!audit) return;
    const idx = audit.findings.findIndex((f) => f.id === findingId);
    if (idx >= 0) {
      audit.findings.splice(idx, 1);
      audit.updatedAt = new Date().toISOString();
      audit.updatedBy = user.id;
      deleted = true;
    }
  });

  if (!deleted) return { ok: false, error: "notFound" };
  refresh();
  return { ok: true };
}
