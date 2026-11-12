import { connection } from "next/server";
import { readDb } from "@/lib/db";

/*
 * Server-side reads. `connection()` keeps these out of the static prerender,
 * so pages always show the latest data. Call only inside <Suspense>.
 */

export async function getStandardsWithStats(departmentId?: string) {
  await connection();
  const db = await readDb();
  return db.standards.map((s) => {
    const items = db.checklists.filter(
      (c) => c.standardId === s.id && (!departmentId || c.departmentId === departmentId),
    );
    const latest = items.map((c) => c.results[0]).filter(Boolean);
    return {
      ...s,
      total: items.length,
      passed: latest.filter((r) => r.passed).length,
      failed: latest.filter((r) => !r.passed).length,
    };
  });
}

export type RequirementClauseOption = {
  id: string;
  number: string;
  name: string;
  departmentId: string;
  checklistIds: string[];
};

export async function getStandardWithChecklists(id: string, departmentId?: string) {
  await connection();
  const db = await readDb();
  const standard = db.standards.find((s) => s.id === id);
  if (!standard) return undefined;
  return {
    standard,
    checklists: db.checklists.filter(
      (c) => c.standardId === id && (!departmentId || c.departmentId === departmentId),
    ),
    requirements: db.requirements
      .filter((r) => r.standardId === id && (!departmentId || r.departmentId === departmentId))
      .map(({ id: reqId, number, name, departmentId: deptId, checklistIds }) => ({
        id: reqId,
        number,
        name,
        departmentId: deptId,
        checklistIds,
      })),
  };
}
