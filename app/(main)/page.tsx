import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getSessionUser } from "@/lib/auth/session";
import { getInspectionItems, getOverview } from "@/lib/dashboard/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

/** Admin gets every department; Employee only their own (scoped on the server). */
async function DashboardData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const [items, overview] = await Promise.all([
    getInspectionItems(isPrivileged ? undefined : user.departmentId),
    getOverview(user),
  ]);
  return <DashboardView items={items} overview={overview} />;
}
