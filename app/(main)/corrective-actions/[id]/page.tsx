import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { NcDetail } from "@/components/nc/NcDetail";
import { NcNotFound } from "@/components/nc/NcNotFound";
import { getSessionUser } from "@/lib/auth/session";
import { getNcDetail } from "@/lib/nc/queries";

export const metadata: Metadata = { title: "NC / CAR" };

export default function Page({ params }: PageProps<"/corrective-actions/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(({ id }) => (
        <NcDetailData id={id} />
      ))}
    </Suspense>
  );
}

async function NcDetailData({ id }: { id: string }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getNcDetail(id, user);
  if (!data) return <NcNotFound />;
  return <NcDetail nc={data.nc} sourceChecklist={data.sourceChecklist} today={data.today} />;
}
