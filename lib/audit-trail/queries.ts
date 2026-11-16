import { connection } from "next/server";
import { readDb } from "@/lib/db";
import type { AuditEntry, User } from "@/lib/types";

/** Full audit log, newest first. Admin only (returns [] for others). Call only inside <Suspense>. */
export async function getAuditLog(user: User): Promise<AuditEntry[]> {
  await connection();
  if (user.role !== "admin" && user.role !== "qe" && user.role !== "iso") return [];
  const db = await readDb();
  return [...db.auditLog].reverse();
}
