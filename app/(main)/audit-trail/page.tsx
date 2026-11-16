import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { AuditTrailView } from "@/components/audit/AuditTrailView";
import { getSessionUser } from "@/lib/auth/session";
import { getAuditLog } from "@/lib/audit-trail/queries";

export const metadata: Metadata = { title: "Audit Trail" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AuditTrailData />
    </Suspense>
  );
}

async function AuditTrailData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AuditTrailView entries={await getAuditLog(user)} />;
}
