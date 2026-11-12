import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RiskListView } from "@/components/risks/RiskListView";
import { PageSkeleton } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { getRiskList } from "@/lib/risks/queries";

export const metadata: Metadata = { title: "Risk Management" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RisksData />
    </Suspense>
  );
}

async function RisksData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getRiskList(user);
  return <RiskListView {...data} />;
}
