import type { InternalAudit } from "@/lib/types";

export const seedAudits: InternalAudit[] = [
  {
    id: "ia-1",
    code: "IA-2026-01",
    title: "ตรวจประเมินระบบคุณภาพประจำปี แผนกผลิต (รอบที่ 1/2026)",
    standardId: "iso9001",
    departmentId: "production",
    leadAuditorId: "u2", // สุดา (ISO Auditor - Quality) ตรวจ Production (ต่างแผนกตาม ISO 9.2.2)
    auditorIds: ["u2", "u1"],
    scheduledDate: "2026-11-07",
    completedDate: "2026-11-07",
    scope: "กระบวนการควบคุมการผลิต, การตรวจปล่อยชิ้นงานแรก (First Piece) และการชี้บ่งและสอบกลับได้ (ข้อ 8.5)",
    status: "completed",
    summary: "กระบวนการผลิตส่วนใหญ่เป็นไปตามข้อกำหนด พบข้อบกพร่อง NC 1 รายการเรื่องบันทึก First Piece (ออกใบ NC-2026-010 แล้ว) และข้อสังเกต 1 รายการเรื่องป้ายชี้บ่งพาเลท",
    findings: [
      {
        id: "f-101",
        clause: "8.5.1",
        question: "การควบคุมการปฏิบัติงานตามขั้นตอนที่กำหนด (WI-PRD-010)",
        result: "conforming",
        evidence: "ตรวจสอบสายการผลิต Line 1 พนักงานปฏิบัติตาม WI-PRD-010 ถูกต้องทุกขั้นตอน",
      },
      {
        id: "f-102",
        clause: "8.5.1",
        question: "การบันทึกผลการตรวจสอบชิ้นงานแรก (First Piece Inspection) ก่อนเดินเครื่องกะเช้า",
        result: "nonconforming",
        evidence: "สุ่มตรวจ Line A เริ่มเดินเครื่องผลิตล็อตเช้าโดยยังไม่ได้ลงบันทึกใบตรวจสอบชิ้นงานแรกตาม WI-PRD-011",
        ncId: "nc-prd-010", // ผูกกับ NC-2026-010
      },
      {
        id: "f-103",
        clause: "8.5.2",
        question: "การชี้บ่งสถานะของชิ้นงานและพาเลทในพื้นที่ผลิต",
        result: "observation",
        evidence: "ป้ายชี้บ่งสถานะพาเลทซีดจางบางจุด แนะนำให้เปลี่ยนป้ายพลาสติกกันน้ำเพื่อความชัดเจน",
      },
    ],
    updatedAt: "2026-11-07T16:00:00.000Z",
    updatedBy: "u2",
  },
  {
    id: "ia-2",
    code: "IA-2026-02",
    title: "ตรวจประเมินระบบสิ่งแวดล้อม แผนกคลังสินค้าและจัดส่ง",
    standardId: "iso14001",
    departmentId: "warehouse",
    leadAuditorId: "u2", // สุดา (Quality) ตรวจ Warehouse
    auditorIds: ["u2"],
    scheduledDate: "2026-11-15",
    completedDate: undefined,
    scope: "การจัดเก็บสารเคมี, การเตรียมความพร้อมกรณีฉุกเฉิน และการคัดแยกของเสียอันตราย (ข้อ 8.1, 8.2)",
    status: "in_progress",
    summary: "กำลังดำเนินการตรวจหน้างาน ณ คลังวัตถุดิบและพื้นที่จัดเก็บของเสียอันตราย",
    findings: [
      {
        id: "f-201",
        clause: "8.1",
        question: "การจัดเก็บและควบคุมการรั่วไหลของสารเคมี (Secondary Containment)",
        result: "conforming",
        evidence: "ถาดรองรับสารเคมีในโซนเคมีภัณฑ์อยู่ในสภาพดี มีป้าย SDS ครบถ้วน",
      },
      {
        id: "f-202",
        clause: "8.1",
        question: "การคัดแยกและจัดเก็บถังของเสียอันตรายในพื้นที่ที่กำหนด",
        result: "nonconforming",
        evidence: "พบถังน้ำมันใช้แล้ววางนอกพื้นที่กั้นสำหรับของเสียอันตราย",
        ncId: "nc-002", // ผูกกับ NC-2026-002
      },
      {
        id: "f-203",
        clause: "8.2",
        question: "ความพร้อมของอุปกรณ์ระงับเหตุสารเคมีรั่วไหล (Spill Kit) ประจำคลังสินค้า",
        result: "pending",
      },
    ],
    updatedAt: "2026-11-15T10:00:00.000Z",
    updatedBy: "u2",
  },
  {
    id: "ia-3",
    code: "IA-2026-03",
    title: "ตรวจประเมินความสอดคล้องระบบคุณภาพ แผนกประกันคุณภาพ (Cross-Audit)",
    standardId: "iso9001",
    departmentId: "quality",
    leadAuditorId: "u5", // กิตติพงศ์ (Lead Auditor จากฝ่ายวิศวกรรม — เป็นอิสระจากฝ่ายประกันคุณภาพตาม ISO 9.2.2)
    auditorIds: ["u5"],
    scheduledDate: "2026-11-22",
    completedDate: undefined,
    scope: "การควบคุมเอกสารและบันทึกคุณภาพ (ข้อ 7.5.3), การสอบเทียบเครื่องมือวัด (ข้อ 7.1.5) และการติดตาม CAR (ข้อ 10.2)",
    status: "in_progress",
    summary: "ใช้ผู้ตรวจข้ามสายงานจากฝ่ายวิศวกรรมตามหลักความเป็นอิสระของผู้ตรวจ (ISO 9001 ข้อ 9.2.2)",
    findings: [
      {
        id: "f-301",
        clause: "7.5.3",
        question: "การควบคุมการแจกจ่ายเอกสารและการเรียกคืนเอกสารฉบับยกเลิก",
        result: "nonconforming",
        evidence: "พบเอกสาร WI ฉบับเดิมที่ถูกแทนที่แล้วยังติดอยู่ที่บอร์ดหน้างาน 1 จุด",
        ncId: "nc-004", // ผูกกับ NC-2026-004
      },
      {
        id: "f-302",
        clause: "7.1.5",
        question: "การชี้บ่งสถานะการสอบเทียบเครื่องมือวัดในห้องปฏิบัติการ QA",
        result: "conforming",
        evidence: "สุ่มตรวจเวอร์เนียร์และไมโครมิเตอร์ 10 ชิ้น มีสติกเกอร์สอบเทียบและใบรับรองครบถ้วน",
      },
    ],
    updatedAt: "2026-11-16T09:00:00.000Z",
    updatedBy: "u5",
  },
  {
    id: "ia-4",
    code: "IA-2026-04",
    title: "ตรวจประเมินการควบคุมการเปลี่ยนแปลงทางวิศวกรรม แผนกวิศวกรรม",
    standardId: "iso9001",
    departmentId: "engineering",
    leadAuditorId: "u1", // สมชาย (QE - Quality) ตรวจ Engineering
    auditorIds: ["u1", "u2"],
    scheduledDate: "2026-11-28",
    completedDate: undefined,
    scope: "การควบคุมแบบพิมพ์เขียว (Master Drawing) และการอนุมัติใบแจ้งเปลี่ยนแปลงทางวิศวกรรม (ECN ข้อ 8.3.6)",
    status: "planned",
    findings: [
      {
        id: "f-401",
        clause: "7.5.3",
        question: "การควบคุมการแจกจ่ายแบบ Master Drawing และเรียกคืนแบบที่ยกเลิกแล้ว",
        result: "pending",
      },
      {
        id: "f-402",
        clause: "8.3.6",
        question: "การทวนสอบและอนุมัติใบแจ้งเปลี่ยนแปลงทางวิศวกรรม (ECN)",
        result: "pending",
      },
    ],
    updatedAt: "2026-11-12T08:00:00.000Z",
    updatedBy: "u1",
  },
  {
    id: "ia-5",
    code: "IA-2026-05",
    title: "ตรวจติดตามภายในรอบที่ 2/2026 แผนกผลิต",
    standardId: "iso9001",
    departmentId: "production",
    leadAuditorId: "u2", // สุดา (Quality) ตรวจ Production
    auditorIds: ["u2"],
    scheduledDate: "2026-11-25",
    completedDate: undefined,
    scope: "การควบคุมพารามิเตอร์สายการผลิต, การบันทึก First Piece Inspection และการชี้บ่งสถานะชิ้นงาน (ข้อ 8.5.1, 8.5.2)",
    status: "planned",
    findings: [
      {
        id: "f-501",
        clause: "8.5.1",
        question: "การตรวจสอบความพร้อมของเครื่องจักรและการบันทึก First Piece ก่อนเริ่มเดินงาน",
        result: "pending",
      },
    ],
    updatedAt: "2026-11-16T10:00:00.000Z",
    updatedBy: "u2",
  },
];
