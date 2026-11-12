/**
 * Shared data types for QE Tracking System – Demo V.1.
 * Fields are a starting structure only; each module's Part may extend them.
 */
import type { Role } from "@/config/access";

export type { Role };

export type User = {
  id: string;
  name: string; // Thai name
  nameEn: string;
  role: Role; // access level
  position: string; // job title, e.g. "QMR"
  department: string; // display text (Part 2)
  departmentId: string; // links to data/departments.ts (Part 5)
  active?: boolean;
};

export type SystemSettings = {
  orgName: string;
  orgShortName: string;
  isoScope: string;
  riskAcceptableMaxScore: number;
  documentReviewCycleDays: number;
  ncDefaultDueDays: number;
  updatedAt: string;
  updatedBy: string;
};

/** Demo login account (plain-text password — Demo only, not for production). */
export type DemoAccount = {
  username: string;
  password: string;
  userId: string;
};

/* ---------- Part 6: Document Control ---------- */

export type DocumentType = "QM" | "QP" | "EP" | "WI" | "FM" | "STD";

export type VersionStatus = "draft" | "published" | "superseded";

export type DocumentVersion = {
  version: number; // 1, 2, 3 ...
  changeNote: string;
  status: VersionStatus;
  createdAt: string; // ISO date-time
  createdBy: string; // user id
  publishedAt?: string;
  publishedBy?: string;
};

/** Shown status: cancelled > published (has an effective version) > draft. */
export type DocumentStatus = "draft" | "published" | "cancelled";

export type IsoDocument = {
  id: string;
  code: string; // e.g. "QP-001" — unique
  docType?: DocumentType; // e.g. "QP", "WI", "FM"
  clause?: string; // optional ISO clause reference, e.g. "7.5.3"
  nextReviewDate?: string; // YYYY-MM-DD scheduled annual review
  title: string;
  description: string;
  standardId: string;
  departmentId: string;
  ownerId: string;
  cancelled?: { at: string; by: string; reason: string };
  versions: DocumentVersion[]; // oldest first; history is never deleted
  downloadLimit: number; // default downloads per user
  userLimits: Record<string, number>; // per-user override (userId → limit)
  downloadsUsed: Record<string, number>; // userId → used count (reset by Admin)
  downloadLog: { userId: string; version: number; at: string }[]; // full history (not reset)
};


/* ---------- Part 3: ISO Standards & Checklists ---------- */

export type Department = {
  id: string;
  name: string; // Thai
  nameEn: string;
};

export type IsoStandard = {
  id: string;
  code: string; // e.g. "ISO 9001"
  version: string; // e.g. "2015"
  name: string;
  description: string;
};

export type ChecklistType = "pass_fail" | "numeric";

/** Numeric pass rule: gte → value ≥ min, lte → value ≤ max, between → min ≤ value ≤ max. */
export type NumericCriteria = {
  operator: "gte" | "lte" | "between";
  min?: number;
  max?: number;
  unit: string;
};

export type ChecklistResult = {
  id: string;
  value: boolean | number; // boolean for pass_fail, number for numeric
  passed: boolean;
  checkedAt: string; // ISO date-time
  checkedBy: string; // user id
  note?: string; // optional remark
};

export type ChecklistItem = {
  id: string;
  standardId: string;
  clause: string; // e.g. "7.1.5"
  title: string;
  departmentId: string;
  type: ChecklistType;
  criteria?: NumericCriteria; // only for numeric
  results: ChecklistResult[]; // newest first
};

/* ---------- Part 4: Requirement Tracking ---------- */

export type Requirement = {
  id: string;
  standardId: string;
  number: string; // e.g. "7.1.5" — unique within a standard
  name: string;
  description: string;
  departmentId: string;
  ownerId: string; // responsible user
  checklistIds: string[]; // linked checklist items (same standard)
};

/** Derived from the latest result of each linked checklist. */
export type RequirementStatus = "compliant" | "non_compliant" | "in_progress" | "not_checked" | "not_linked";

/* ---------- Part 7: NC / CAR Tracking ---------- */

/** Stored workflow status. "Overdue" is derived from dueDate (see lib/nc.ts). */
export type NcStatus = "open" | "in_progress" | "pending_verification" | "closed";

export type NcEventType =
  | "created"
  | "car_issued"
  | "car_updated"
  | "plan_saved"
  | "progress"
  | "submitted"
  | "verify_rejected"
  | "closed";

export type NcEvent = {
  at: string; // ISO date-time
  by: string; // user id
  type: NcEventType;
  note?: string;
  percent?: number; // progress updates
};

export type Nonconformity = {
  id: string;
  number: string; // NC-2026-001
  title: string;
  description: string; // the problem found
  standardId: string;
  clause: string;
  departmentId: string; // department where the NC was found / CAR is issued to
  source: "manual" | "checklist";
  /** Snapshot of the failed inspection (source = checklist). Never changed afterwards. */
  checklist?: { checklistId: string; resultId: string; value: boolean | number; checkedAt: string };
  car?: { number: string; ownerId: string; dueDate: string; issuedAt: string; issuedBy: string }; // dueDate = YYYY-MM-DD
  rootCause: string;
  correctiveAction: string;
  preventiveAction?: string;
  progress: number; // 0–100, latest update
  status: NcStatus;
  verification?: { at: string; by: string; note: string };
  events: NcEvent[]; // oldest first
  createdAt: string;
  createdBy: string;
};

/* ---------- Part 8: KPI & Audit Trail ---------- */

export type KpiDirection = "higher" | "lower"; // which way is better

export type Kpi = {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  standardId: string; // "" = not linked to a standard
  unit: string;
  direction: KpiDirection;
  target: number;
  actual: number | null; // null = not measured yet
  period: string; // measurement month, YYYY-MM
  updatedAt: string;
  updatedBy: string;
};

/* ---------- Part 6: Risk & Training ---------- */

export type RiskStatus = "open" | "mitigating" | "monitored" | "closed";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskItem = {
  id: string;
  code: string; // e.g. "RSK-2026-01"
  title: string;
  description: string;
  standardId: string;
  clause: string;
  departmentId: string;
  ownerId: string;
  likelihood: number; // 1–5
  impact: number; // 1–5
  mitigationPlan: string;
  status: RiskStatus;
  reviewDate: string; // YYYY-MM-DD
  updatedAt: string;
  updatedBy: string;
};

export type TrainingStatus = "planned" | "completed";
export type TrainingHealth = "planned" | "valid" | "expiring" | "expired";

export type TrainingRecord = {
  id: string;
  code: string; // e.g. "TRN-2026-01"
  title: string;
  userId: string;
  departmentId: string;
  standardId: string;
  clause: string;
  trainer: string;
  status: TrainingStatus;
  completedDate?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  score?: number; // 0–100
  passed?: boolean;
  note?: string;
  updatedAt: string;
  updatedBy: string;
};

export type AuditEntityType =
  | "auth"
  | "standard"
  | "checklist"
  | "requirement"
  | "document"
  | "nc"
  | "kpi"
  | "risk"
  | "training"
  | "user"
  | "settings";

export type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "record_result"
  | "new_version"
  | "publish"
  | "cancel"
  | "set_limit"
  | "reset_downloads"
  | "download"
  | "issue_car"
  | "update_car"
  | "save_plan"
  | "progress"
  | "submit"
  | "verify_pass"
  | "verify_fail";

export type AuditChange = { field: string; from: string; to: string };

export type AuditEntry = {
  id: string;
  at: string; // ISO date-time
  userId: string;
  userName: string; // snapshot at the time of the action
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string; // e.g. "QP-001", "NC-2026-001"
  changes?: AuditChange[];
  note?: string;
};
