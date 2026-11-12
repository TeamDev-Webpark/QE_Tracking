"use client";

import { Badge, Button, Card, DataTable, PageHeader, type Column } from "@/components/ui";
import { StatTile } from "@/components/dashboard/StatTile";
import { useI18n } from "@/components/providers/I18nProvider";
import { departmentName, formatDate } from "@/lib/format";
import type { DepartmentReportRow, StandardReportRow } from "@/lib/reports/queries";

type ReportOverview = {
  standardsCount: number;
  requirementsCount: number;
  totalChecklists: number;
  passedChecklists: number;
  failedChecklists: number;
  pendingChecklists: number;
  compliancePct: number;
  totalDocs: number;
  publishedDocs: number;
  totalNcs: number;
  openNcs: number;
  closedNcs: number;
  overdueNcs: number;
  totalRisks: number;
  highRisks: number;
  closedOrMonitoredRisks: number;
  totalKpis: number;
  kpiMet: number;
  totalTraining: number;
  trainingValid: number;
};

function csvCell(v: string | number): string {
  const s = String(v).replaceAll('"', '""');
  return `"${s}"`;
}

export function ReportsView({
  generatedAt,
  orgName,
  isoScope,
  overview,
  byStandard,
  byDepartment,
}: {
  generatedAt: string;
  orgName: string;
  isoScope: string;
  overview: ReportOverview;
  byStandard: StandardReportRow[];
  byDepartment: DepartmentReportRow[];
}) {
  const { lang } = useI18n();

  function handleExportCsv() {
    const lines: string[] = [
      ["รายงานสรุประบบบริหารคุณภาพ ISO (Management Review)", orgName, `วันที่ ${generatedAt}`].map(csvCell).join(","),
      "",
      ["สรุปตามมาตรฐาน ISO"].map(csvCell).join(","),
      ["รหัสมาตรฐาน", "ชื่อมาตรฐาน", "ข้อกำหนด", "รายการตรวจทั้งหมด", "ผ่าน", "ไม่ผ่าน", "รอตรวจ", "ความสอดคล้อง (%)"].map(csvCell).join(","),
      ...byStandard.map((s) =>
        [
          s.code,
          s.name,
          s.requirementsCount,
          s.checklistsCount,
          s.passedCount,
          s.failedCount,
          s.pendingCount,
          `${s.compliancePct}%`,
        ]
          .map(csvCell)
          .join(","),
      ),
      "",
      ["สรุปผลการดำเนินงานรายแผนก"].map(csvCell).join(","),
      ["แผนก", "ข้อกำหนด", "ความสอดคล้อง (%)", "NC เปิดอยู่", "NC เกินกำหนด", "ความเสี่ยงสูง/วิกฤต", "KPI ผ่านเป้า", "อบรมเสร็จสิ้น"].map(csvCell).join(","),
      ...byDepartment.map((d) =>
        [
          departmentName(d.id, lang),
          d.requirementsCount,
          `${d.compliancePct}%`,
          d.openNcCount,
          d.overdueNcCount,
          d.highRiskCount,
          `${d.kpiMetCount}/${d.kpiTotalCount}`,
          `${d.trainingCompletedCount}/${d.trainingTotalCount}`,
        ]
          .map(csvCell)
          .join(","),
      ),
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iso-management-report-${generatedAt}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const standardColumns: Column<StandardReportRow>[] = [
    {
      key: "code",
      header: "มาตรฐาน",
      render: (s) => (
        <div>
          <p className="font-semibold text-text">{s.code}</p>
          <p className="text-xs text-text-muted">{s.name}</p>
        </div>
      ),
    },
    {
      key: "requirements",
      header: "ข้อกำหนด",
      render: (s) => <span className="font-medium text-text">{s.requirementsCount}</span>,
    },
    {
      key: "checklists",
      header: "ผลตรวจ (ผ่าน / ไม่ผ่าน / รอตรวจ)",
      render: (s) => (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge tone="success">ผ่าน {s.passedCount}</Badge>
          <Badge tone="danger">ไม่ผ่าน {s.failedCount}</Badge>
          <Badge tone="neutral">รอตรวจ {s.pendingCount}</Badge>
        </div>
      ),
    },
    {
      key: "compliance",
      header: "ความสอดคล้อง",
      render: (s) => (
        <div className="flex min-w-[140px] items-center gap-2.5">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-page">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${s.compliancePct}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs font-semibold text-text">{s.compliancePct}%</span>
        </div>
      ),
    },
  ];

  const departmentColumns: Column<DepartmentReportRow>[] = [
    {
      key: "name",
      header: "แผนก",
      render: (d) => <span className="font-semibold text-text">{departmentName(d.id, lang)}</span>,
    },
    {
      key: "compliance",
      header: "ความสอดคล้อง Checklist",
      render: (d) => (
        <span className="text-xs font-semibold text-text">
          {d.compliancePct}% <span className="font-normal text-text-muted">({d.passedCount}/{d.checklistsCount})</span>
        </span>
      ),
    },
    {
      key: "nc",
      header: "NC เปิดอยู่",
      render: (d) => (
        <div className="flex items-center gap-1.5">
          <Badge tone={d.openNcCount > 0 ? "warning" : "success"}>{d.openNcCount} รายการ</Badge>
          {d.overdueNcCount > 0 && <Badge tone="danger">เกินกำหนด {d.overdueNcCount}</Badge>}
        </div>
      ),
    },
    {
      key: "risks",
      header: "ความเสี่ยงสูง/วิกฤต",
      render: (d) => (
        <Badge tone={d.highRiskCount > 0 ? "danger" : "success"}>
          {d.highRiskCount > 0 ? `${d.highRiskCount} รายการ` : "ไม่มี"}
        </Badge>
      ),
    },
    {
      key: "kpi",
      header: "KPI ผ่านเป้า",
      render: (d) => (
        <span className="text-xs font-medium text-text">
          {d.kpiMetCount} / {d.kpiTotalCount}
        </span>
      ),
    },
    {
      key: "training",
      header: "อบรมเสร็จสิ้น",
      render: (d) => (
        <span className="text-xs font-medium text-text">
          {d.trainingCompletedCount} / {d.trainingTotalCount}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="รายงานสรุประบบ ISO"
        description="ข้อมูลสรุปสำหรับทบทวนโดยฝ่ายบริหาร (Management Review — ISO 9001 ข้อ 9.3)"
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="secondary" onClick={handleExportCsv}>
              ส่งออก CSV (Excel)
            </Button>
            <Button onClick={() => window.print()}>พิมพ์รายงาน / PDF</Button>
          </div>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-text">{orgName}</p>
            <p className="mt-0.5 text-xs text-text-muted">ขอบเขตระบบ: {isoScope}</p>
          </div>
          <span className="rounded-lg bg-page px-3 py-1.5 text-xs font-medium text-text-muted">
            ข้อมูล ณ วันที่ {formatDate(generatedAt, lang)}
          </span>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="ความสอดคล้อง Checklist"
          value={`${overview.compliancePct}%`}
          note={`ผ่าน ${overview.passedChecklists} จาก ${overview.totalChecklists} รายการ (${overview.standardsCount} มาตรฐาน)`}
          accent={overview.compliancePct >= 80 ? "success" : "neutral"}
        />
        <StatTile
          label="NC / CAPA คงค้าง"
          value={String(overview.openNcs)}
          note={
            overview.overdueNcs > 0
              ? `เกินกำหนด ${overview.overdueNcs} รายการ · ปิดแล้ว ${overview.closedNcs}`
              : `ปิดแล้ว ${overview.closedNcs} จากทั้งหมด ${overview.totalNcs} รายการ`
          }
          accent={overview.overdueNcs > 0 ? "danger" : overview.openNcs > 0 ? "neutral" : "success"}
        />
        <StatTile
          label="ความเสี่ยงสูง / วิกฤต"
          value={String(overview.highRisks)}
          note={`ติดตามผล/ปิดแล้ว ${overview.closedOrMonitoredRisks} จาก ${overview.totalRisks} รายการ`}
          accent={overview.highRisks > 0 ? "danger" : "success"}
        />
        <StatTile
          label="KPI & ความพร้อมบุคลากร"
          value={`${overview.kpiMet}/${overview.totalKpis}`}
          note={`KPI ผ่านเป้า · อบรมใช้งานได้ ${overview.trainingValid}/${overview.totalTraining} · เอกสารเผยแพร่ ${overview.publishedDocs}`}
          accent="primary"
        />
      </div>

      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-text">สรุปความสอดคล้องตามมาตรฐาน ISO</h2>
          <p className="text-xs text-text-muted">ภาพรวมข้อกำหนดและผลการตรวจประเมินแยกตามมาตรฐาน</p>
        </div>
        <DataTable
          rows={byStandard}
          columns={standardColumns}
          rowKey={(r) => r.id}
          emptyTitle="ยังไม่มีข้อมูลมาตรฐาน"
          defaultPageSize={10}
        />
      </Card>

      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-text">สรุปผลการดำเนินงานรายแผนก</h2>
          <p className="text-xs text-text-muted">เปรียบเทียบความสอดคล้อง, NC คงค้าง, ความเสี่ยง, KPI และการฝึกอบรมของแต่ละแผนก</p>
        </div>
        <DataTable
          rows={byDepartment}
          columns={departmentColumns}
          rowKey={(r) => r.id}
          emptyTitle="ยังไม่มีข้อมูลแผนก"
          defaultPageSize={10}
        />
      </Card>
    </div>
  );
}
