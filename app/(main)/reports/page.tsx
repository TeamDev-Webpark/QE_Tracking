import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ReportsView } from "@/components/reports/ReportsView";
import { PageSkeleton } from "@/components/ui";
import { canAccess } from "@/config/access";
import { getSessionUser } from "@/lib/auth/session";
import { getIsoReportSummary } from "@/lib/reports/queries";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsData />
    </Suspense>
  );
}

async function ReportsData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccess(user.role, "/reports")) redirect("/");
  const summary = await getIsoReportSummary();
  return <ReportsView {...summary} />;
}
