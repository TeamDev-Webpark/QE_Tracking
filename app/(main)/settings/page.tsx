import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/SettingsView";
import { PageSkeleton } from "@/components/ui";
import { canAccess } from "@/config/access";
import { getSessionUser } from "@/lib/auth/session";
import { getSettingsPageData } from "@/lib/settings/queries";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsData />
    </Suspense>
  );
}

async function SettingsData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccess(user.role, "/settings")) redirect("/");
  const data = await getSettingsPageData();
  return <SettingsView {...data} />;
}
