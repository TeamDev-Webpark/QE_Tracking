import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { NcList } from "@/components/nc/NcList";
import { getSessionUser } from "@/lib/auth/session";
import { NC_DISPLAY_STATUSES, type NcDisplayStatus } from "@/lib/nc";
import { getNcList } from "@/lib/nc/queries";

export const metadata: Metadata = { title: "NC / CAR" };

export default function Page({ searchParams }: PageProps<"/corrective-actions">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NcData searchParams={searchParams} />
    </Suspense>
  );
}

async function NcData({ searchParams }: { searchParams: PageProps<"/corrective-actions">["searchParams"] }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // ?status=overdue (links from the Dashboard) opens that tab; anything else shows all.
  const status = (await searchParams).status;
  const initialTab = NC_DISPLAY_STATUSES.find((s) => s === status) as NcDisplayStatus | undefined;
  const { items, candidates, standards, requirements, today } = await getNcList(user);
  return (
    <NcList
      key={initialTab ?? "all"}
      items={items}
      candidates={candidates}
      standards={standards}
      requirements={requirements}
      today={today}
      initialTab={initialTab}
    />
  );
}
