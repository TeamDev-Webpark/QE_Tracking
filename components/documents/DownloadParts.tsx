"use client";

import { useI18n } from "@/components/providers/I18nProvider";
import { CloseIcon } from "@/components/icons";
import type { DownloadQuota } from "@/lib/documents";
import { cn } from "@/lib/cn";

/** "เหลือ 2 จาก 3 ครั้ง" / "ไม่จำกัด" — red when no rights are left. */
export function QuotaText({ quota }: { quota: DownloadQuota | null }) {
  const { t } = useI18n();
  if (quota === null) return <span className="text-sm whitespace-nowrap text-text-muted">{t.documents.unlimited}</span>;
  return (
    <span className={cn("text-sm font-semibold whitespace-nowrap", quota.remaining === 0 ? "text-danger" : "text-text")}>
      {t.documents.remainingOf.replace("{remaining}", String(quota.remaining)).replace("{limit}", String(quota.limit))}
    </span>
  );
}

/** Result banner after a download attempt. */
export function DownloadMessage({ message, onClose }: { message?: { ok: boolean; text: string }; onClose: () => void }) {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <div
      role="status"
      className={cn(
        "mb-4 flex items-center justify-between gap-3 rounded-control px-4 py-3 text-sm font-semibold",
        message.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      {message.text}
      <button type="button" onClick={onClose} aria-label={t.common.close} className="rounded p-1 hover:bg-white/50">
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  );
}
