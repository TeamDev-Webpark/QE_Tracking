import { randomUUID } from "node:crypto";
import type { AuditAction, AuditChange, AuditEntityType, AuditEntry, User } from "./types";

/** Text form of a value for the audit log. */
export function auditValue(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.map(auditValue).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Fields whose value changed between `before` and `after`. */
export function diffFields<K extends string>(
  before: { [P in K]?: unknown } | undefined,
  after: { [P in K]?: unknown },
  fields: K[],
): AuditChange[] {
  return fields
    .map((field) => ({
      field,
      from: auditValue(before?.[field]),
      to: auditValue(after[field]),
    }))
    .filter((c) => c.from !== c.to);
}

/**
 * Build an audit entry. Push it inside the same updateDb() call as the change,
 * so data and its audit record are always saved together.
 */
export function auditEntry(
  user: Pick<User, "id" | "name">,
  action: AuditAction,
  entity: { type: AuditEntityType; id: string; label: string },
  extra: { changes?: AuditChange[]; note?: string } = {},
): AuditEntry {
  return {
    id: randomUUID(),
    at: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    action,
    entityType: entity.type,
    entityId: entity.id,
    entityLabel: entity.label,
    ...(extra.changes?.length ? { changes: extra.changes } : {}),
    ...(extra.note ? { note: extra.note } : {}),
  };
}
