import { getUserById } from "@/data";
import { seedChecklists } from "@/data/checklists";
import { seedDocuments } from "@/data/documents";
import { seedKpis } from "@/data/kpis";
import { seedNonconformities } from "@/data/nonconformities";
import type { AuditAction, AuditChange, AuditEntityType, AuditEntry } from "@/lib/types";

/**
 * Seed Audit Trail, derived from the other seed data so the history always matches it
 * (document versions, checklist results, NC/CAR events, KPI updates).
 * Used as the starting `auditLog` of the Demo store; new actions are appended after it.
 */
export function buildSeedAuditLog(): AuditEntry[] {
  type Draft = Omit<AuditEntry, "id" | "userName"> & { userId: string };
  const drafts: Draft[] = [];

  const add = (
    at: string,
    userId: string,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    entityLabel: string,
    extra: { changes?: AuditChange[]; note?: string } = {},
  ) => {
    if (!at || !getUserById(userId)) return;
    drafts.push({ at, userId, action, entityType, entityId, entityLabel, ...extra });
  };

  /* Checklist results */
  for (const c of seedChecklists) {
    for (const r of c.results) {
      const unit = c.criteria?.unit ? ` ${c.criteria.unit}` : "";
      const value = typeof r.value === "boolean" ? String(r.value) : `${r.value}${unit}`;
      add(r.checkedAt, r.checkedBy, "record_result", "checklist", c.id, `${c.clause} ${c.title}`, {
        changes: [
          { field: "value", from: "", to: value },
          { field: "result", from: "", to: r.passed ? "PASS" : "FAIL" },
          { field: "checkedAt", from: "", to: r.checkedAt },
        ],
        ...(r.note ? { note: r.note } : {}),
      });
    }
  }

  /* Documents: create / new version / publish */
  for (const d of seedDocuments) {
    for (const v of d.versions) {
      if (v.version === 1) {
        add(v.createdAt, v.createdBy, "create", "document", d.id, d.code, {
          changes: [
            { field: "code", from: "", to: d.code },
            { field: "title", from: "", to: d.title },
            { field: "version", from: "", to: "1 (draft)" },
          ],
        });
      } else {
        add(v.createdAt, v.createdBy, "new_version", "document", d.id, d.code, {
          changes: [{ field: "version", from: "", to: `${v.version} (draft)` }],
          note: v.changeNote,
        });
      }
      if (v.publishedAt && v.publishedBy) {
        add(v.publishedAt, v.publishedBy, "publish", "document", d.id, d.code, {
          changes: [{ field: "publishedVersion", from: v.version > 1 ? String(v.version - 1) : "", to: String(v.version) }],
        });
      }
    }
  }

  /* NC / CAR events */
  for (const n of seedNonconformities) {
    let lastProgress = 0;
    for (const e of n.events) {
      const label = n.number;
      switch (e.type) {
        case "created":
          add(e.at, e.by, "create", "nc", n.id, label, {
            changes: [
              { field: "title", from: "", to: n.title },
              { field: "departmentId", from: "", to: n.departmentId },
            ],
            note: n.source === "checklist" ? "checklist" : "manual",
          });
          break;
        case "car_issued":
        case "car_updated":
          add(e.at, e.by, e.type === "car_issued" ? "issue_car" : "update_car", "nc", n.id, `${n.number} / ${n.car?.number ?? ""}`, {
            changes: [
              { field: "ownerId", from: "", to: n.car?.ownerId ?? "" },
              { field: "dueDate", from: "", to: n.car?.dueDate ?? "" },
            ],
          });
          break;
        case "plan_saved":
          add(e.at, e.by, "save_plan", "nc", n.id, label, {
            changes: [
              { field: "rootCause", from: "", to: n.rootCause },
              { field: "correctiveAction", from: "", to: n.correctiveAction },
            ],
          });
          break;
        case "progress": {
          const to = e.percent ?? lastProgress;
          add(e.at, e.by, "progress", "nc", n.id, label, {
            changes: [{ field: "progress", from: String(lastProgress), to: String(to) }],
            ...(e.note ? { note: e.note } : {}),
          });
          lastProgress = to;
          break;
        }
        case "submitted":
          lastProgress = 100;
          add(e.at, e.by, "submit", "nc", n.id, label, {
            changes: [{ field: "status", from: "in_progress", to: "pending_verification" }],
            ...(e.note ? { note: e.note } : {}),
          });
          break;
        case "verify_rejected":
          add(e.at, e.by, "verify_fail", "nc", n.id, label, {
            changes: [{ field: "status", from: "pending_verification", to: "in_progress" }],
            ...(e.note ? { note: e.note } : {}),
          });
          break;
        case "closed":
          add(e.at, e.by, "verify_pass", "nc", n.id, label, {
            changes: [{ field: "status", from: "pending_verification", to: "closed" }],
            ...(e.note ? { note: e.note } : {}),
          });
          break;
      }
    }
  }

  /* KPI measurements */
  for (const k of seedKpis) {
    if (k.actual === null) continue;
    add(k.updatedAt, k.updatedBy, "update", "kpi", k.id, k.name, {
      changes: [
        { field: "actual", from: "", to: String(k.actual) },
        { field: "period", from: "", to: k.period },
      ],
    });
  }

  /* One login per user per working day on which they did something */
  const seen = new Set<string>();
  for (const d of [...drafts]) {
    const day = d.at.slice(0, 10);
    const key = `${d.userId}|${day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const u = getUserById(d.userId)!;
    const t = Date.parse(d.at) - 15 * 60_000; // logged in 15 minutes before the first action
    drafts.push({ at: new Date(t).toISOString(), userId: u.id, action: "login", entityType: "auth", entityId: u.id, entityLabel: u.nameEn });
  }

  return drafts
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((d, i) => ({ ...d, id: `seed-audit-${String(i + 1).padStart(4, "0")}`, userName: getUserById(d.userId)!.name }));
}
