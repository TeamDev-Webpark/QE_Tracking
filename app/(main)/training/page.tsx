import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TrainingListView } from "@/components/training/TrainingListView";
import { PageSkeleton } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { getTrainingList } from "@/lib/training/queries";

export const metadata: Metadata = { title: "Training & Competence" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TrainingData />
    </Suspense>
  );
}

async function TrainingData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getTrainingList(user);
  return <TrainingListView {...data} />;
}
