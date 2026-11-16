"use client";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Dictionary } from "@/i18n/dictionaries";

type ModuleKey = keyof Dictionary["pages"];

/** Temporary page for modules not developed yet. */
export function ModulePlaceholder({ module }: { module: ModuleKey }) {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t.nav[module]} description={t.pages[module]} />
      <Card>
        <EmptyState title={t.common.comingSoon} description={t.common.comingSoonDesc} />
      </Card>
    </>
  );
}
