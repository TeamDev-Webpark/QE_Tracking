import type { TrainingCourse } from "@/lib/types";

/** Seed data — copied into `.data/db.json` on first run. */
export const seedTrainingCourses: TrainingCourse[] = [
  {
    id: "crs-01",
    code: "CRS-01",
    name: "ISO 9001 Awareness",
    description: "ความรู้พื้นฐานข้อกำหนดระบบบริหารงานคุณภาพ ISO 9001:2015 แนวคิดเชิงกระบวนการ และ PDCA (ข้อกำหนด 7.2 / 7.3)",
    standardId: "iso9001",
    durationHours: 6,
    validityMonths: 12,
    active: true,
    updatedAt: "2026-06-01T09:00:00.000Z",
    updatedBy: "u4",
  },
  {
    id: "crs-02",
    code: "CRS-02",
    name: "Quality Policy & Quality Objectives",
    description: "การสร้างความตระหนักรู้ด้านนโยบายคุณภาพ เป้าหมายคุณภาพ (KPI) และการมีส่วนร่วมของบุคลากร (ข้อกำหนด 5.2 / 6.2 / 7.3)",
    standardId: "iso9001",
    durationHours: 3,
    validityMonths: 12,
    active: true,
    updatedAt: "2026-06-01T09:00:00.000Z",
    updatedBy: "u1",
  },
  {
    id: "crs-03",
    code: "CRS-03",
    name: "Document Control",
    description: "การควบคุมเอกสารสารสนเทศ การขึ้นทะเบียน การแจกจ่าย และการเรียกคืนเอกสารยกเลิก (ข้อกำหนด 7.5.3)",
    standardId: "iso9001",
    durationHours: 4,
    validityMonths: 12,
    active: true,
    updatedAt: "2026-06-01T09:00:00.000Z",
    updatedBy: "u2",
  },
];
