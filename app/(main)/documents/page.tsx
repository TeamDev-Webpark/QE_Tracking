import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { DocumentList } from "@/components/documents/DocumentList";
import { getSessionUser } from "@/lib/auth/session";
import { getDocumentList } from "@/lib/documents/queries";

export const metadata: Metadata = { title: "Document Control" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocumentsData />
    </Suspense>
  );
}

async function DocumentsData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { documents, standards, requirements } = await getDocumentList(user);
  return <DocumentList documents={documents} standards={standards} requirements={requirements} />;
}
