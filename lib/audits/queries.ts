import { connection } from "next/server";
import { getUserById, getUsers } from "@/data";
import { readDb } from "@/lib/db";
import { displayName } from "@/lib/user";
import { isAuditOverdue, nextAuditCode, summarizeAuditFindings } from "@/lib/audits";
import type { InternalAudit, User } from "@/lib/types";

export type UpcomingAuditNotice = {
  id: string;
  code: string;
  title: string;
  standardLabel: string;
  departmentId: string;
  scheduledDate: string; // YYYY-MM-DD (Date only, no time)
  leadAuditorName: string;
  scope: string;
  status: "planned" | "in_progress";
};

export type AuditView = InternalAudit & {
  standardLabel: string;
  leadAuditorName: string;
  isOverdue: boolean;
  summaryFindings: {
    total: number;
    conforming: number;
    observation: number;
    nonconforming: number;
    pending: number;
  };
};

export async function getUpcomingAuditNotices(user: User): Promise<UpcomingAuditNotice[]> {
  await connection();
  const db = await readDb();
  const stdMap = new Map(db.standards.map((s) => [s.id, `${s.code}:${s.version}`]));
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";

  return db.audits
    .filter((a) => a.status === "planned" || a.status === "in_progress")
    .filter((a) => isPrivileged || a.departmentId === user.departmentId)
    .map((a) => {
      const lead = db.users.find((u) => u.id === a.leadAuditorId) ?? getUserById(a.leadAuditorId);
      return {
        id: a.id,
        code: a.code,
        title: a.title,
        standardLabel: stdMap.get(a.standardId) ?? a.standardId,
        departmentId: a.departmentId,
        scheduledDate: a.scheduledDate,
        leadAuditorName: lead ? displayName(lead, "th") : "-",
        scope: a.scope,
        status: a.status as "planned" | "in_progress",
      };
    })
    .sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""));
}

export async function getAuditList(user?: User) {
  await connection();
  const db = await readDb();
  const stdMap = new Map(db.standards.map((s) => [s.id, `${s.code}:${s.version}`]));
  const isEmployee = user?.role === "employee";

  const visibleAudits = isEmployee
    ? db.audits.filter((a) => a.departmentId === user.departmentId)
    : db.audits;

  const audits: AuditView[] = visibleAudits
    .map((a) => {
      const lead = db.users.find((u) => u.id === a.leadAuditorId) ?? getUserById(a.leadAuditorId);
      return {
        ...a,
        standardLabel: stdMap.get(a.standardId) ?? a.standardId,
        leadAuditorName: lead ? displayName(lead, "th") : "-",
        isOverdue: isAuditOverdue(a),
        summaryFindings: summarizeAuditFindings(a.findings),
      };
    })
    .sort((a, b) => (b.scheduledDate || "").localeCompare(a.scheduledDate || ""));

  const standards = db.standards.map((s) => ({ id: s.id, label: `${s.code}:${s.version} — ${s.name}` }));
  const auditors = db.users
    .filter((u) => (u.role === "admin" || u.role === "qe" || u.role === "iso") && u.active !== false)
    .map((u) => ({ id: u.id, name: displayName(u, "th"), role: u.role, departmentId: u.departmentId }));

  return {
    audits,
    standards,
    auditors,
    nextCode: nextAuditCode(db.audits.map((a) => a.code)),
  };
}

export async function getAuditDetail(id: string) {
  await connection();
  const db = await readDb();
  const audit = db.audits.find((a) => a.id === id);
  if (!audit) return null;

  const standard = db.standards.find((s) => s.id === audit.standardId);
  const lead = getUserById(audit.leadAuditorId);
  const auditors = getUsers().filter((u) => audit.auditorIds?.includes(u.id));
  const ncMap = new Map(db.nonconformities.map((n) => [n.id, n]));

  return {
    audit: {
      ...audit,
      standardLabel: standard ? `${standard.code}:${standard.version} — ${standard.name}` : audit.standardId,
      leadAuditorName: lead ? displayName(lead, "th") : "-",
      auditorNames: auditors.map((u) => displayName(u, "th")),
      isOverdue: isAuditOverdue(audit),
      summaryFindings: summarizeAuditFindings(audit.findings),
      findings: audit.findings.map((f) => ({
        ...f,
        linkedNc: f.ncId ? ncMap.get(f.ncId) : undefined,
      })),
    },
    standards: db.standards.map((s) => ({ id: s.id, label: `${s.code}:${s.version} — ${s.name}` })),
    requirements: db.requirements.filter((r) => Boolean(r.publishedAt) && r.standardId === audit.standardId),
  };
}
