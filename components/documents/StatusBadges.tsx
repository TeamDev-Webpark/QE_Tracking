"use client";

import { Badge, type BadgeTone } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import type { ReviewStatus } from "@/lib/documents";
import type { DocumentStatus, DocumentType, VersionStatus } from "@/lib/types";

const docTones: Record<DocumentStatus, BadgeTone> = {
  draft: "info",
  published: "success",
  cancelled: "neutral",
};

const versionTones: Record<VersionStatus, BadgeTone> = {
  draft: "info",
  published: "success",
  superseded: "neutral",
};

const typeTones: Record<DocumentType, BadgeTone> = {
  QM: "primary",
  QP: "primary",
  EP: "success",
  WI: "info",
  FM: "warning",
  STD: "neutral",
};

const reviewTones: Record<ReviewStatus, BadgeTone> = {
  overdue: "danger",
  due_soon: "warning",
  ok: "success",
  none: "neutral",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useI18n();
  return (
    <Badge tone={docTones[status]} title={t.documentStatusTooltip[status]}>
      {t.documentStatus[status]}
    </Badge>
  );
}

export function VersionStatusBadge({ status }: { status: VersionStatus }) {
  const { t } = useI18n();
  return (
    <Badge tone={versionTones[status]} title={t.versionStatusTooltip[status]}>
      {t.versionStatus[status]}
    </Badge>
  );
}

export function DocumentTypeBadge({ type }: { type: DocumentType }) {
  const { t } = useI18n();
  return (
    <Badge tone={typeTones[type]} title={t.documents.docTypeLabels[type]}>
      {type}
    </Badge>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const { t } = useI18n();
  if (status === "none") return null;
  return <Badge tone={reviewTones[status]}>{t.documents.reviewStatus[status]}</Badge>;
}
