"use client";

import { Badge } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

/** Pass / Fail / Not checked (passed undefined). */
export function ResultBadge({ passed }: { passed?: boolean }) {
  const { t } = useI18n();
  if (passed === undefined) {
    return (
      <Badge tone="neutral" title={t.checklist.notCheckedTooltip}>
        {t.checklist.notChecked}
      </Badge>
    );
  }
  return passed ? (
    <Badge tone="success" title={t.checklist.passTooltip}>
      {t.checklist.pass}
    </Badge>
  ) : (
    <Badge tone="danger" title={t.checklist.failTooltip}>
      {t.checklist.fail}
    </Badge>
  );
}
