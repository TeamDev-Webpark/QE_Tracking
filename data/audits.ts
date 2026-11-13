import type { InternalAudit } from "@/lib/types";

export const seedAudits: InternalAudit[] = [
  {
    id: "ia-1",
    code: "IA-2026-01",
    title: "ตรวจประเมินระบบคุณภาพประจำปี แผนกผลิต (รอบที่ 1/2026)",
    standardId: "iso-9001",
    departmentId: "production",
    leadAuditorId: "u2", // สุดา (ISO Auditor)
    auditorIds: ["u2"],
    scheduledDate: "2026-02-15",
    completedDate: "2026-02-16",
    scope: "กระบวนการควบคุมการผลิต, การตรวจปล่อยชิ้นงาน และการชี้บ่งและสอบกลับได้ (ข้อ 8.5)",
    status: "completed",
    summary: "กระบวนการผลิตส่วนใหญ่เป็นไปตามข้อกำหนด พบข้อบกพร่อง NC 1 รายการเรื่องบันทึก First Piece และข้อสังเกต 1 รายการเรื่องการจัดเก็บพาเลท",
    findings: [
      {
        id: "f-101",
        clause: "8.5.1",
        question: "การควบคุมการปฏิบัติงานตามขั้นตอนที่กำหนด (WI)",
        result: "conforming",
        evidence: "ตรวจสอบสายการผลิต Line 1 พนักงานปฏิบัติตาม WI-PRD-001 ถูกต้องทุกขั้นตอน",
      },
      {
        id: "f-102",
        clause: "8.6",
        question: "การบันทึกผลการตรวจสอบชิ้นงานแรก (First Piece Inspection) ก่อนเดินเครื่องกะเช้า",
        result: "nonconforming",
        evidence: "สุ่มตรวจ Line 2 ไม่พบการลงบันทึกผล First piece ในแบบฟอร์ม FM-QC-002 ของวันที่ 14 ก.พ.",
        ncId: "nc-2", // ผูกกับ NC-2026-002
      },
      {
        id: "f-103",
        clause: "8.5.2",
        question: "การชี้บ่งสถานะของชิ้นงานและพาเลทในพื้นที่ผลิต",
        result: "observation",
        evidence: "ป้ายชี้บ่งสถานะพาเลทซีดจางบางจุด แนะนำให้เปลี่ยนป้ายใหม่เพื่อความชัดเจน",
      },
    ],
    updatedAt: "2026-02-16T16:00:00.000Z",
    updatedBy: "u2",
  },
  {
    id: "ia-2",
    code: "IA-2026-02",
    title: "ตรวจประเมินระบบสิ่งแวดล้อม แผนกคลังสินค้าและจัดส่ง",
    standardId: "iso-14001",
    departmentId: "warehouse",
    leadAuditorId: "u2",
    auditorIds: ["u2"],
    scheduledDate: "2026-03-20",
    completedDate: undefined,
    scope: "การจัดเก็บสารเคมี, การเตรียมความพร้อมกรณีฉุกเฉิน และการคัดแยกขยะอันตราย",
    status: "in_progress",
    summary: "กำลังดำเนินการตรวจหน้างาน ณ คลังวัตถุดิบและพื้นที่ถ่ายเทสารเคมี",
    findings: [
      {
        id: "f-201",
        clause: "8.1",
        question: "การจัดเก็บและควบคุมการรั่วไหลของสารเคมี (Secondary Containment)",
        result: "conforming",
        evidence: "ถาดรองรับสารเคมีอยู่ในสภาพดี ไม่พบการรั่วไหล",
      },
      {
        id: "f-202",
        clause: "8.2",
        question: "ความพร้อมของอุปกรณ์ระงับเหตุสารเคมีรั่วไหล (Spill Kit)",
        result: "pending",
      },
    ],
    updatedAt: "2026-03-20T10:00:00.000Z",
    updatedBy: "u2",
  },
  {
    id: "ia-3",
    code: "IA-2026-03",
    title: "ตรวจประเมินความสอดคล้องระบบคุณภาพ แผนกวิศวกรรม",
    standardId: "iso-9001",
    departmentId: "engineering",
    leadAuditorId: "u1", // สมชาย (QE)
    auditorIds: ["u1"],
    scheduledDate: "2026-05-10",
    completedDate: undefined,
    scope: "การควบคุมแบบและเอกสารทางวิศวกรรม, การทบทวนการออกแบบ (Design Review)",
    status: "planned",
    findings: [
      {
        id: "f-301",
        clause: "8.3.4",
        question: "การเก็บบันทึกผลการทวนสอบการออกแบบ (Design Verification)",
        result: "pending",
      },
    ],
    updatedAt: "2026-03-01T08:00:00.000Z",
    updatedBy: "u1",
  },
];
