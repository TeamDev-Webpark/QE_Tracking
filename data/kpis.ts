import type { Kpi } from "@/lib/types";

const at = "2026-11-01T02:00:00.000Z";

/** Seed data — copied into the Demo store (.data/db.json) on first run. Period = October 2026. */
export const seedKpis: Kpi[] = [
  { id: "kpi-01", name: "อัตราการผ่านการตรวจ Checklist", description: "รายการที่ผ่าน ÷ รายการที่ตรวจทั้งหมด", departmentId: "quality", standardId: "iso9001", unit: "%", direction: "higher", target: 90, actual: 85.7, period: "2026-10", updatedAt: at, updatedBy: "u1" },
  { id: "kpi-02", name: "จำนวนข้อร้องเรียนจากลูกค้า", description: "ข้อร้องเรียนด้านคุณภาพที่ได้รับต่อเดือน", departmentId: "quality", standardId: "iso9001", unit: "ครั้ง", direction: "lower", target: 2, actual: 1, period: "2026-10", updatedAt: at, updatedBy: "u1" },
  { id: "kpi-03", name: "CAR ที่ปิดได้ตามกำหนด", description: "CAR ที่ปิดภายในกำหนด ÷ CAR ที่ครบกำหนดทั้งหมด", departmentId: "quality", standardId: "iso9001", unit: "%", direction: "higher", target: 95, actual: 100, period: "2026-10", updatedAt: at, updatedBy: "u1" },
  { id: "kpi-04", name: "อัตราของเสียจากการผลิต", description: "ชิ้นงานเสีย ÷ ชิ้นงานที่ผลิตทั้งหมด", departmentId: "production", standardId: "iso9001", unit: "%", direction: "lower", target: 2, actual: 1.4, period: "2026-10", updatedAt: at, updatedBy: "u1" },
  { id: "kpi-05", name: "ประสิทธิภาพโดยรวมของเครื่องจักร (OEE)", description: "Availability × Performance × Quality", departmentId: "production", standardId: "", unit: "%", direction: "higher", target: 85, actual: 78, period: "2026-10", updatedAt: at, updatedBy: "u1" },
  { id: "kpi-06", name: "ปริมาณการใช้ไฟฟ้า", description: "การใช้ไฟฟ้ารวมทั้งโรงงานต่อเดือน", departmentId: "maintenance", standardId: "iso14001", unit: "kWh", direction: "lower", target: 50000, actual: 52300, period: "2026-10", updatedAt: at, updatedBy: "u1" },
  { id: "kpi-07", name: "ปริมาณของเสียอันตรายที่ส่งกำจัด", description: "น้ำหนักของเสียอันตรายที่ส่งกำจัดต่อเดือน", departmentId: "safety-env", standardId: "iso14001", unit: "kg", direction: "lower", target: 500, actual: null, period: "2026-10", updatedAt: at, updatedBy: "u1" },
];
