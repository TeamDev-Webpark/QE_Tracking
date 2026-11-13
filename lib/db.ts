import { promises as fs } from "node:fs";
import path from "node:path";
import { seedStandards } from "@/data/standards";
import { seedChecklists } from "@/data/checklists";
import { seedRequirements } from "@/data/requirements";
import { seedDocuments } from "@/data/documents";
import { seedNonconformities } from "@/data/nonconformities";
import { seedKpis } from "@/data/kpis";
import { seedRisks } from "@/data/risks";
import { seedTraining } from "@/data/training";
import { seedAudits } from "@/data/audits";
import { users as seedUsers } from "@/data/users";
import { buildSeedAuditLog } from "@/data/auditLog";
import type {
  AuditEntry,
  ChecklistItem,
  InternalAudit,
  IsoDocument,
  IsoStandard,
  Kpi,
  Nonconformity,
  Requirement,
  RiskItem,
  SystemSettings,
  TrainingRecord,
  User,
} from "./types";

export const DEFAULT_SETTINGS: SystemSettings = {
  orgName: "บริษัท ควอลิตี้ เอ็นจิเนียริ่ง จำกัด (Demo)",
  orgShortName: "QE Tracking",
  isoScope: "ระบบบริหารงานคุณภาพ ISO 9001:2015 และสิ่งแวดล้อม ISO 14001:2015",
  riskAcceptableMaxScore: 9,
  documentReviewCycleDays: 365,
  ncDefaultDueDays: 14,
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedBy: "u4",
};

/**
 * Demo data store (server only).
 * Data is saved to `.data/db.json` and read on every request.
 * Delete that file to reset to the seed data (no restart needed).
 */
export type DemoDb = {
  standards: IsoStandard[];
  checklists: ChecklistItem[];
  requirements: Requirement[];
  documents: IsoDocument[];
  nonconformities: Nonconformity[];
  kpis: Kpi[];
  risks: RiskItem[];
  training: TrainingRecord[];
  audits: InternalAudit[];
  users: User[];
  settings: SystemSettings;
  auditLog: AuditEntry[]; // newest last
};

const DB_FILE = path.join(process.cwd(), ".data", "db.json");

function buildSeedDb(): DemoDb {
  return {
    standards: structuredClone(seedStandards),
    checklists: structuredClone(seedChecklists),
    requirements: structuredClone(seedRequirements),
    documents: structuredClone(seedDocuments),
    nonconformities: structuredClone(seedNonconformities),
    kpis: structuredClone(seedKpis),
    risks: structuredClone(seedRisks),
    training: structuredClone(seedTraining),
    audits: structuredClone(seedAudits),
    users: structuredClone(seedUsers).map((u) => ({ ...u, active: u.active ?? true })),
    settings: structuredClone(DEFAULT_SETTINGS),
    auditLog: buildSeedAuditLog(),
  };
}

export async function readDb(): Promise<DemoDb> {
  try {
    const parsed = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as Partial<DemoDb>;
    return {
      standards: parsed.standards ?? structuredClone(seedStandards),
      checklists: parsed.checklists ?? structuredClone(seedChecklists),
      requirements: parsed.requirements ?? structuredClone(seedRequirements),
      documents: parsed.documents ?? structuredClone(seedDocuments),
      nonconformities: parsed.nonconformities ?? structuredClone(seedNonconformities),
      kpis: parsed.kpis ?? structuredClone(seedKpis),
      risks: parsed.risks ?? structuredClone(seedRisks),
      training: parsed.training ?? structuredClone(seedTraining),
      audits: parsed.audits ?? structuredClone(seedAudits),
      users: parsed.users?.length ? parsed.users : structuredClone(seedUsers).map((u) => ({ ...u, active: u.active ?? true })),
      settings: parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : structuredClone(DEFAULT_SETTINGS),
      auditLog: parsed.auditLog?.length ? parsed.auditLog : buildSeedAuditLog(),
    };
  } catch {
    return buildSeedDb();
  }
}

/** Apply a change and persist it. */
export async function updateDb(change: (db: DemoDb) => void): Promise<void> {
  const db = await readDb();
  change(db);
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

/** Reset the persisted demo database back to seed data. */
export async function resetDb(): Promise<void> {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(buildSeedDb(), null, 2), "utf8");
}
