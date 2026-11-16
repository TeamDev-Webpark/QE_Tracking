"use client";

import { Badge, type BadgeTone } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import type { RequirementStatus } from "@/lib/types";

const tones: Record<RequirementStatus, BadgeTone> = {
  compliant: "success",
  non_compliant: "danger",
  in_progress: "warning",
  not_checked: "primary",
  not_linked: "neutral",
};

export function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  const { t } = useI18n();
  return (
    <Badge tone={tones[status]} title={t.requirementStatusTooltip[status]}>
      {t.requirementStatus[status]}
    </Badge>
  );
}
