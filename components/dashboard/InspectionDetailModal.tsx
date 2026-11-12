"use client";

import Link from "next/link";
import { DataTable, Modal, type Column } from "@/components/ui";
import { EditIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { ResultBadge } from "@/components/standards/ResultBadge";
import { getUserById } from "@/data";
import { formatCriteria } from "@/lib/checklist";
import type { InspectionItem } from "@/lib/dashboard";
import { departmentName, formatDateTime } from "@/lib/format";
import type { ChecklistResult } from "@/lib/types";
import { displayName } from "@/lib/user";

/** Full details of one check item: rule, latest result and inspection history. */
export function InspectionDetailModal({
  item,
  onClose,
  hideStandardLink = false,
}: {
  item: InspectionItem;
  onClose: () => void;
  hideStandardLink?: boolean;
}) {
  const { lang, t } = useI18n();
  const latest = item.results[0];

  const valueText = (r: ChecklistResult) =>
    typeof r.value === "number"
      ? `${r.value.toLocaleString("en-US")}${item.criteria?.unit ? ` ${item.criteria.unit}` : ""}`
      : r.value
        ? t.checklist.pass
        : t.checklist.fail;
  const inspector = (r: ChecklistResult) => {
    const u = getUserById(r.checkedBy);
    return u ? displayName(u, lang) : r.checkedBy;
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t.dashboard.detailTitle}
      size="lg"
      closeLabel={t.common.close}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {hideStandardLink ? (
            <div />
          ) : (
            <Link
              href={`/standards/${item.standardId}?highlight=${item.id}&dept=${item.departmentId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary-soft/60 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all shadow-2xs group"
            >
              <EditIcon width={13} height={13} />
              <span>ไปแก้ไขในหน้ามาตรฐาน {item.standardLabel} ↗</span>
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-page px-3.5 py-1.5 text-xs font-semibold text-text hover:bg-border/60 transition-colors cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-muted">
              <Link
                href={`/standards/${item.standardId}?highlight=${item.id}&dept=${item.departmentId}`}
                className="text-primary font-bold hover:underline inline-flex items-center gap-1 group"
                title={`ไปที่หน้ามาตรฐาน ${item.standardLabel}`}
              >
                <span>{item.standardLabel}</span>
                <span className="text-[10px] text-primary/70 transition-transform group-hover:translate-x-0.5">↗</span>
              </Link>
              <span> · {t.checklist.clause} {item.clause}</span>
            </p>
            <p className="mt-1 text-base font-bold text-text">{item.title}</p>
          </div>
          <Link
            href={`/standards/${item.standardId}?highlight=${item.id}&dept=${item.departmentId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft/60 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all shadow-2xs shrink-0"
          >
            <EditIcon width={12} height={12} />
            <span>แก้ไขข้อนี้ ↗</span>
          </Link>
        </div>

        <dl className="grid gap-3 rounded-control bg-page p-4 sm:grid-cols-2">
          <Detail label={t.checklist.department} value={departmentName(item.departmentId, lang)} />
          <Detail
            label={t.checklist.type}
            value={item.type === "pass_fail" ? t.checklist.typePassFail : t.checklist.typeNumeric}
          />
          {item.criteria && <Detail label={t.checklist.criteria} value={formatCriteria(item.criteria)} />}
        </dl>

        <div>
          <h3 className="mb-2 font-bold">{t.checklist.lastResult}</h3>
          {latest ? (
            <dl className="grid gap-3 rounded-control border border-border p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-text-muted">{t.checklist.result}</dt>
                <dd className="mt-1">
                  <ResultBadge passed={latest.passed} />
                </dd>
              </div>
              {item.type === "numeric" && <Detail label={t.checklist.value} value={valueText(latest)} />}
              <Detail label={t.checklist.checkedAt} value={formatDateTime(latest.checkedAt, lang)} />
              <Detail label={t.checklist.checkedBy} value={inspector(latest)} />
            </dl>
          ) : (
            <p className="rounded-control border border-border p-4 text-text-muted">{t.checklist.notChecked}</p>
          )}
        </div>

        {item.results.length > 0 && (
          <div>
            <h3 className="mb-2 font-bold">
              {t.dashboard.history} ({item.results.length})
            </h3>
            <DataTable
              rows={item.results}
              rowKey={(r) => r.id}
              defaultPageSize={10}
              columns={
                [
                  {
                    key: "checkedAt",
                    header: t.checklist.checkedAt,
                    className: "whitespace-nowrap",
                    render: (r) => formatDateTime(r.checkedAt, lang),
                  },
                  {
                    key: "value",
                    header: t.checklist.value,
                    render: (r) => (
                      <div>
                        <span className="tabular-nums">{valueText(r)}</span>
                        {r.note && <p className="mt-0.5 text-xs text-text-muted">{r.note}</p>}
                      </div>
                    ),
                  },
                  {
                    key: "result",
                    header: t.checklist.result,
                    render: (r) => <ResultBadge passed={r.passed} />,
                  },
                  {
                    key: "checkedBy",
                    header: t.checklist.checkedBy,
                    render: (r) => inspector(r),
                  },
                ] satisfies Column<(typeof item.results)[number]>[]
              }
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
