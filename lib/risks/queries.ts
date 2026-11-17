import { connection } from "next/server";
import { getUserById, getUsers } from "@/data";
import { readDb } from "@/lib/db";
import { nextRiskCode, riskLevel, riskScore } from "@/lib/risks";
import type { RequirementClauseOption } from "@/lib/standards/queries";
import type { RiskItem, RiskLevel, User } from "@/lib/types";
import { displayName } from "@/lib/user";

export type RiskView = RiskItem & {
  standardLabel: string;
  ownerName: string;
  initialScore: number;
  initialLevel: RiskLevel;
  residualScore?: number;
  residualLevel?: RiskLevel;
  score: number;
  level: RiskLevel;
};

export type RiskRequirementOption = RequirementClauseOption & {
  standardId: string;
};

export async function getRiskList(user: User) {
  await connection();
  const db = await readDb();
  const stdById = new Map(db.standards.map((s) => [s.id, `${s.code}:${s.version}`]));
  const canSeeAll = user.role === "admin" || user.role === "qe" || user.role === "iso";

  const visible = canSeeAll
    ? db.risks
    : db.risks.filter((r) => r.departmentId === user.departmentId);

  const risks: RiskView[] = visible
    .map((r) => {
      const initialScore = riskScore(r.likelihood, r.impact);
      const initialLevel = riskLevel(initialScore);
      const hasResidual =
        (r.status === "monitored" || r.status === "closed") &&
        typeof r.residualLikelihood === "number" &&
        typeof r.residualImpact === "number" &&
        r.residualLikelihood >= 1 &&
        r.residualImpact >= 1;
      const residualScore = hasResidual ? riskScore(r.residualLikelihood!, r.residualImpact!) : undefined;
      const residualLevel = residualScore !== undefined ? riskLevel(residualScore) : undefined;
      const score = residualScore ?? initialScore;
      const level = residualLevel ?? initialLevel;
      const owner = db.users.find((u) => u.id === r.ownerId) ?? getUserById(r.ownerId);
      return {
        ...r,
        standardLabel: r.standardId ? (stdById.get(r.standardId) ?? r.standardId) : "-",
        ownerName: owner ? displayName(owner, "th") : "-",
        initialScore,
        initialLevel,
        residualScore,
        residualLevel,
        score,
        level,
      };
    })
    .sort((a, b) => b.score - a.score || b.code.localeCompare(a.code));

  const requirements: RiskRequirementOption[] = db.requirements
    .filter((r) => Boolean(r.publishedAt))
    .map((r) => ({
    id: r.id,
    standardId: r.standardId,
    number: r.number,
    name: r.name,
    departmentId: r.departmentId,
    checklistIds: r.checklistIds,
  }));

  return {
    risks,
    standards: db.standards.map((s) => ({ id: s.id, label: `${s.code}:${s.version}` })),
    owners: getUsers().map((u) => ({ id: u.id, name: displayName(u, "th"), departmentId: u.departmentId })),
    requirements,
    nextCode: nextRiskCode(db.risks.map((r) => r.code)),
  };
}
