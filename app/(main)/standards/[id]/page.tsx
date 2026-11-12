import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { ChecklistView } from "@/components/standards/ChecklistView";
import { StandardNotFound } from "@/components/standards/StandardNotFound";
import { getSessionUser } from "@/lib/auth/session";
import { getStandardWithChecklists } from "@/lib/standards/queries";

export const metadata: Metadata = { title: "Checklist" };

export default function Page({ params }: PageProps<"/standards/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(({ id }) => (
        <ChecklistData id={id} />
      ))}
    </Suspense>
  );
}

async function ChecklistData({ id }: { id: string }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const isPrivileged = user.role === "admin" || user.role === "qe" || user.role === "iso";
  const data = await getStandardWithChecklists(id, isPrivileged ? undefined : user.departmentId);
  if (!data) return <StandardNotFound />;
  return <ChecklistView standard={data.standard} checklists={data.checklists} requirements={data.requirements} />;
}
