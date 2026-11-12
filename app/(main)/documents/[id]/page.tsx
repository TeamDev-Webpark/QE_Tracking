import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { DocumentDetail } from "@/components/documents/DocumentDetail";
import { DocumentNotFound } from "@/components/documents/DocumentNotFound";
import { getSessionUser } from "@/lib/auth/session";
import { getDocumentDetail } from "@/lib/documents/queries";

export const metadata: Metadata = { title: "Document" };

export default function Page({ params }: PageProps<"/documents/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(({ id }) => (
        <DocumentData id={id} />
      ))}
    </Suspense>
  );
}

async function DocumentData({ id }: { id: string }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getDocumentDetail(id, user);
  if (!data) return <DocumentNotFound />;
  return <DocumentDetail doc={data.document} standards={data.standards} requirements={data.requirements} />;
}
