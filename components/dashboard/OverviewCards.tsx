"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardTitle } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import type { Overview } from "@/lib/dashboard/queries";
import { StatusRows, type Segment } from "./StatusRows";

/** Document Control & NC/CAR summary cards, linking to their respective modules. */
export function OverviewCards({ overview }: { overview: Overview }) {
  const { t } = useI18n();
  const role = useSessionUser().role;
  const isPrivileged = role === "admin" || role === "qe" || role === "iso";
  const { nc, docs } = overview;

  const ncTotal = Object.values(nc.counts).reduce((a, b) => a + b, 0);
  const ncNotClosed = ncTotal - nc.counts.closed;
  const ncTones = {
    overdue: "danger",
    open: "info",
    in_progress: "warning",
    pending_verification: "purple",
    closed: "success",
  } as const;
  const docTones = {
    published: "success",
    draft: "info",
    cancelled: "neutral",
  } as const;

  const ncSegments: Segment[] = (
    [
      ["overdue", "bg-rose-500"],
      ["open", "bg-sky-500"],
      ["in_progress", "bg-amber-500"],
      ["pending_verification", "bg-purple-500"],
      ["closed", "bg-emerald-500"],
    ] as const
  ).map(([key, color]) => ({
    key,
    color,
    label: t.ncStatus[key],
    title: t.ncStatusTooltip[key],
    tone: ncTones[key],
    value: nc.counts[key],
    href: `/corrective-actions?status=${key}`,
  }));

  const docSegments: Segment[] = (
    [
      ["published", "bg-emerald-500"],
      ["draft", "bg-sky-500"],
      ["cancelled", "bg-slate-400"],
    ] as const
  )
    .filter(([key]) => isPrivileged || key === "published")
    .map(([key, color]) => ({
      key,
      color,
      label: t.documentStatus[key],
      title: t.documentStatusTooltip[key],
      tone: docTones[key],
      value: docs.counts[key],
      href: "/documents",
    }));

  return (
    <div className="mb-6 grid gap-6 lg:grid-cols-2">
      <OverviewCard
        title={t.nav.documents}
        href="/documents"
        value={String(docs.counts.published)}
        note={t.dashboard.docsPublished}
      >
        <StatusRows segments={docSegments} ariaLabel={t.nav.documents} />
        {isPrivileged && docs.counts.draft > 0 && (
          <p className="mt-4 border-t border-border/60 pt-4 text-sm text-text-muted">
            {t.dashboard.docsDrafts.replace("{n}", String(docs.counts.draft))}
          </p>
        )}
      </OverviewCard>

      <OverviewCard
        title={t.nav.correctiveActions}
        href="/corrective-actions"
        value={String(ncNotClosed)}
        note={t.dashboard.ncNotClosed.replace("{n}", String(ncTotal))}
      >
        <StatusRows segments={ncSegments} ariaLabel={t.nav.correctiveActions} />
      </OverviewCard>
    </div>
  );
}

function OverviewCard({
  title,
  href,
  value,
  note,
  children,
}: {
  title: string;
  href: string;
  value: string;
  note: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <Link href={href} className="text-xs font-semibold whitespace-nowrap text-primary hover:underline">
          {t.dashboard.viewAll}
        </Link>
      </div>
      <p className="text-3xl leading-none font-bold tabular-nums">{value}</p>
      <p className="mt-2 mb-4 text-xs text-text-muted">{note}</p>
      {children}
    </Card>
  );
}
