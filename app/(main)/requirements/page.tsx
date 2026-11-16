import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { RequirementRegister } from "@/components/requirements/RequirementRegister";
import { getSessionUser } from "@/lib/auth/session";
import { getRequirementRegister } from "@/lib/requirements/queries";

export const metadata: Metadata = { title: "Requirement Register" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RegisterData />
    </Suspense>
  );
}

async function RegisterData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const { rows, standards, checklists } = await getRequirementRegister(
    isPrivileged ? undefined : user.departmentId,
  );
  return <RequirementRegister rows={rows} standards={standards} checklists={checklists} />;
}
