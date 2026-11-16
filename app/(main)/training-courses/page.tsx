import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TrainingCourseListView } from "@/components/training/TrainingCourseListView";
import { PageSkeleton } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { getTrainingCourses } from "@/lib/training/courseQueries";

export const metadata: Metadata = { title: "Training Courses" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CoursesData />
    </Suspense>
  );
}

async function CoursesData() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getTrainingCourses();
  return <TrainingCourseListView {...data} />;
}
