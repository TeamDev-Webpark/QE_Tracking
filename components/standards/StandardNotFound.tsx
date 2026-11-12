"use client";

import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

export function StandardNotFound() {
  const { t } = useI18n();
  return (
    <Card>
      <EmptyState
        title={t.standards.notFound}
        action={
          <Link href="/standards" className="text-sm font-semibold text-primary hover:underline">
            {t.common.back}
          </Link>
        }
      />
    </Card>
  );
}
