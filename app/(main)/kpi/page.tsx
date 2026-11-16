import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { KpiPage } from "@/components/kpi/KpiPage";
import { getSessionUser } from "@/lib/auth/session";
import { getKpis } from "@/lib/kpi/queries";
import { todayInBangkok } from "@/lib/nc";

export const metadata: Metadata = { title: "KPI" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <KpiData />
    </Suspense>
  );
}

async function KpiData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { kpis, standards } = await getKpis(user);
  return <KpiPage kpis={kpis} standards={standards} defaultPeriod={todayInBangkok().slice(0, 7)} />;
}
