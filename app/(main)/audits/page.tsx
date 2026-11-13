import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuditListView } from "@/components/audits/AuditListView";
import { PageSkeleton } from "@/components/ui";
import { canAccess } from "@/config/access";
import { getSessionUser } from "@/lib/auth/session";
import { getAuditList } from "@/lib/audits/queries";

export const metadata: Metadata = { title: "Internal Audits" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AuditsData />
    </Suspense>
  );
}

async function AuditsData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccess(user.role, "/audits")) redirect("/");
  const data = await getAuditList();
  return <AuditListView {...data} />;
}
