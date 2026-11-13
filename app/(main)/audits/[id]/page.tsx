import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AuditDetailView } from "@/components/audits/AuditDetailView";
import { PageSkeleton } from "@/components/ui";
import { canAccess } from "@/config/access";
import { getSessionUser } from "@/lib/auth/session";
import { getAuditDetail } from "@/lib/audits/queries";

export const metadata: Metadata = { title: "Audit Details" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AuditData id={id} />
    </Suspense>
  );
}

async function AuditData({ id }: { id: string }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccess(user.role, "/audits")) redirect("/");

  const data = await getAuditDetail(id);
  if (!data) notFound();

  return <AuditDetailView audit={data.audit} requirements={data.requirements} />;
}
