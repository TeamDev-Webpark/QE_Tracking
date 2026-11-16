"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, DataTable, PageHeader, type BadgeTone, type Column } from "@/components/ui";
import { StatTile } from "@/components/dashboard/StatTile";
import { EditIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { useI18n } from "@/components/providers/I18nProvider";
import { useSessionUser } from "@/components/providers/SessionProvider";
import { departmentName, formatDate } from "@/lib/format";
import type { AuditView } from "@/lib/audits/queries";
import type { InternalAuditStatus } from "@/lib/types";
import { AuditPlanModal } from "./AuditPlanModal";

const STATUS_TONE: Record<InternalAuditStatus, BadgeTone> = {
  planned: "neutral",
  in_progress: "warning",
  completed: "success",
};

const STATUS_LABEL: Record<InternalAuditStatus, string> = {
  planned: "วางแผนไว้",
  in_progress: "กำลังตรวจ",
  completed: "ตรวจเสร็จแล้ว",
};

export function AuditListView({
  audits,
  standards,
  auditors,
  nextCode,
}: {
  audits: AuditView[];
  standards: { id: string; label: string }[];
  auditors: { id: string; name: string; role: string }[];
  nextCode: string;
}) {
  const { lang } = useI18n();
  const user = useSessionUser();
  const canManage = user.role === "admin" || user.role === "qe" || user.role === "iso";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InternalAuditStatus | "all">("all");
  const [modalAudit, setModalAudit] = useState<AuditView | null | undefined>(undefined);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audits.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      const text = `${a.code} ${a.title} ${a.scope} ${departmentName(a.departmentId, lang)} ${a.leadAuditorName}`.toLowerCase();
      return text.includes(q);
    });
  }, [audits, statusFilter, search, lang]);

  const plannedCount = audits.filter((a) => a.status === "planned").length;
  const inProgressCount = audits.filter((a) => a.status === "in_progress").length;
  const completedCount = audits.filter((a) => a.status === "completed").length;
  const totalFindings = audits.reduce((sum, a) => sum + a.summaryFindings.total, 0);
  const totalNc = audits.reduce((sum, a) => sum + a.summaryFindings.nonconforming, 0);

  const columns: Column<AuditView>[] = [
    {
      key: "code",
      header: "รหัส / ชื่องานตรวจ",
      render: (a) => (
        <div className="min-w-[220px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-primary">{a.code}</span>
            <Badge tone="purple">{a.standardLabel}</Badge>
            {a.isOverdue && <Badge tone="danger">เกินกำหนด</Badge>}
          </div>
          <Link
            href={`/audits/${a.id}`}
            className="mt-0.5 block font-semibold text-text hover:text-primary transition-colors"
          >
            {a.title}
          </Link>
          <p className="mt-0.5 text-xs text-text-muted">
            แผนก: {departmentName(a.departmentId, lang)} · ผู้ตรวจ: {a.leadAuditorName}
          </p>
        </div>
      ),
    },
    {
      key: "date",
      header: "วันที่กำหนดตรวจ",
      render: (a) => <span className="text-xs text-text-muted">{formatDate(a.scheduledDate, lang)}</span>,
    },
    {
      key: "status",
      header: "สถานะ",
      render: (a) => <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>,
    },
    {
      key: "findings",
      header: "ผลตรวจ (ผ่าน / ข้อสังเกต / NC)",
      render: (a) => (
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <Badge tone="success">ผ่าน {a.summaryFindings.conforming}</Badge>
          <Badge tone="warning">ข้อสังเกต {a.summaryFindings.observation}</Badge>
          <Badge tone={a.summaryFindings.nonconforming > 0 ? "danger" : "neutral"}>
            NC {a.summaryFindings.nonconforming}
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-px text-right",
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/audits/${a.id}`}
            className="rounded-control px-2.5 py-1 text-xs font-semibold text-primary hover:bg-page"
          >
            เข้าตรวจ →
          </Link>
          {canManage && (
            <button
              type="button"
              onClick={() => setModalAudit(a)}
              className="rounded-control p-1.5 text-text-muted hover:bg-page hover:text-primary cursor-pointer"
              title="แก้ไขแผนตรวจ"
            >
              <EditIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ตรวจติดตามภายใน (Internal Audit)"
        description="วางแผนการตรวจประเมิน บันทึกผลการตรวจ และส่งต่อข้อบกพร่องเป็นใบ NC (ISO 9001 ข้อ 9.2)"
        actions={
          canManage ? (
            <Button onClick={() => setModalAudit(null)}>
              <PlusIcon className="h-4 w-4" /> สร้างแผนตรวจใหม่
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="แผนตรวจทั้งหมด"
          value={String(audits.length)}
          note={`เสร็จสิ้นแล้ว ${completedCount} แผน`}
          accent="primary"
        />
        <StatTile
          label="กำลังดำเนินการตรวจ"
          value={String(inProgressCount)}
          note={`รอดำเนินการ ${plannedCount} แผน`}
          accent={inProgressCount > 0 ? "neutral" : "success"}
        />
        <StatTile
          label="ข้อบกพร่องที่พบ (NC)"
          value={String(totalNc)}
          note="ส่งต่อเพื่อออกใบ CAR ทันที"
          accent={totalNc > 0 ? "danger" : "success"}
        />
        <StatTile
          label="ผลการตรวจทั้งหมด"
          value={String(totalFindings)}
          note="ข้อกำหนดที่ได้รับการสุ่มตรวจ"
          accent="neutral"
        />
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหารหัส, ชื่องานตรวจ หรือแผนก..."
              className="h-10 w-full rounded-control border border-border bg-page pl-9 pr-3 text-sm text-text outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(["all", "planned", "in_progress", "completed"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-text-muted hover:text-text"
                }`}
              >
                {st === "all" ? "ทั้งหมด" : STATUS_LABEL[st]}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(a) => a.id}
          emptyTitle="ไม่พบแผนการตรวจประเมิน"
          defaultPageSize={10}
        />
      </Card>

      <AuditPlanModal
        open={modalAudit !== undefined}
        audit={modalAudit ?? null}
        standards={standards}
        auditors={auditors}
        nextCode={nextCode}
        onClose={() => setModalAudit(undefined)}
      />
    </div>
  );
}
