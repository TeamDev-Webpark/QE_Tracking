import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { StandardsView } from "@/components/standards/StandardsView";
import { getSessionUser } from "@/lib/auth/session";
import { getStandardsWithStats } from "@/lib/standards/queries";

export const metadata: Metadata = { title: "ISO Standards" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StandardsData />
    </Suspense>
  );
}

async function StandardsData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const standards = await getStandardsWithStats(isPrivileged ? undefined : user.departmentId);
  return <StandardsView standards={standards} />;
}
