import Link from "next/link";
import { Card } from "@/components/ui";
import type { AuditInspectionSummary } from "@/lib/dashboard/queries";

export function InspectionComparisonCard({
  dailyTotal,
  dailyPassed,
  dailyFailed,
  dailyCompliance,
  auditSummary,
}: {
  dailyTotal: number;
  dailyPassed: number;
  dailyFailed: number;
  dailyPending?: number;
  dailyCompliance: number;
  auditSummary: AuditInspectionSummary;
}) {
  const dailyPassPct = dailyTotal > 0 ? Math.round((dailyPassed / dailyTotal) * 100) : 0;
  const auditTotal = auditSummary.totalFindings;
  const auditPassPct = auditTotal > 0 ? Math.round((auditSummary.conformingFindings / auditTotal) * 100) : 0;

  return (
    <Card className="mb-6 p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-text">
          เปรียบเทียบผลการตรวจสอบ: มาตรฐาน ISO VS ตรวจติดตามภายใน
        </h2>
        <p className="mt-0.5 text-xs text-text-muted">
          เปรียบเทียบภาพรวมระหว่างงานตรวจประจำวันหน้างาน กับการสุ่มตรวจประเมินระบบตามรอบ (คลิกที่การ์ดเพื่อเปิดดู)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* การ์ดฝั่งซ้าย: ตรวจประจำวัน */}
        <Link
          href="/standards"
          className="group block rounded-2xl border-2 border-blue-100 bg-white p-5 transition-all hover:border-primary hover:shadow-md"
        >
          {/* หัวข้อ */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-text group-hover:text-primary transition-colors flex items-center gap-1">
                <span>มาตรฐาน ISO (Checklist)</span>
                <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </h3>
              <p className="mt-0.5 text-xs text-text-muted">ผู้ตรวจ: พนักงาน / หัวหน้ากะหน้างาน</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-muted block">อัตราผ่าน</span>
              <span className="text-2xl font-black text-emerald-600">{dailyCompliance}%</span>
            </div>
          </div>

          {/* แถบกราฟหลอดพลังแบบคลีน */}
          <div className="my-4 space-y-1.5">
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
              <div
                style={{ width: `${dailyPassPct}%` }}
                className="h-full rounded-full bg-emerald-500 transition-all"
              />
            </div>
            <div className="flex justify-between text-[11px] text-text-muted">
              <span>ผ่านเกณฑ์ {dailyPassPct}%</span>
              <span>เป้าหมาย 80%+</span>
            </div>
          </div>

          {/* สรุปตัวเลข 3 ช่อง คลีนตา */}
          <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center">
            <div className="rounded-xl bg-slate-50 py-2">
              <span className="block text-[11px] text-text-muted">ทั้งหมด</span>
              <span className="text-lg font-bold text-text">{dailyTotal}</span>
            </div>
            <div className="rounded-xl bg-emerald-50 py-2">
              <span className="block text-[11px] text-emerald-700 font-medium">✓ ผ่าน</span>
              <span className="text-lg font-bold text-emerald-600">{dailyPassed}</span>
            </div>
            <div className="rounded-xl bg-rose-50 py-2">
              <span className="block text-[11px] text-rose-700 font-medium">✗ ไม่ผ่าน</span>
              <span className="text-lg font-bold text-rose-600">{dailyFailed}</span>
            </div>
          </div>
        </Link>

        {/* การ์ดฝั่งขวา: สุ่มตรวจติดตาม */}
        <Link
          href="/audits"
          className="group block rounded-2xl border-2 border-purple-100 bg-white p-5 transition-all hover:border-purple-500 hover:shadow-md"
        >
          {/* หัวข้อ */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-text group-hover:text-purple-700 transition-colors flex items-center gap-1">
                <span>ตรวจติดตามภายใน (Internal Audit)</span>
                <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </h3>
              <p className="mt-0.5 text-xs text-text-muted">ผู้ตรวจ: ทีม ISO Auditor / QE</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-muted block">อัตราผ่าน</span>
              <span className="text-2xl font-black text-purple-700">{auditSummary.passRate}%</span>
            </div>
          </div>

          {/* แถบกราฟหลอดพลังแบบคลีน */}
          <div className="my-4 space-y-1.5">
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
              <div
                style={{ width: `${auditPassPct}%` }}
                className="h-full rounded-full bg-purple-600 transition-all"
              />
            </div>
            <div className="flex justify-between text-[11px] text-text-muted">
              <span>ผ่านเกณฑ์ {auditPassPct}%</span>
              <span>ตรวจแล้ว {auditSummary.completedPlans}/{auditSummary.totalPlans} แผน</span>
            </div>
          </div>

          {/* สรุปตัวเลข 3 ช่อง คลีนตา */}
          <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center">
            <div className="rounded-xl bg-slate-50 py-2">
              <span className="block text-[11px] text-text-muted">สุ่มตรวจ</span>
              <span className="text-lg font-bold text-text">{auditTotal} ข้อ</span>
            </div>
            <div className="rounded-xl bg-emerald-50 py-2">
              <span className="block text-[11px] text-emerald-700 font-medium">✓ ถูกต้อง</span>
              <span className="text-lg font-bold text-emerald-600">{auditSummary.conformingFindings}</span>
            </div>
            <div className="rounded-xl bg-rose-50 py-2">
              <span className="block text-[11px] text-rose-700 font-medium">⚠️ พบ NC</span>
              <span className="text-lg font-bold text-rose-600">{auditSummary.ncFindings}</span>
            </div>
          </div>
        </Link>
      </div>
    </Card>
  );
}
