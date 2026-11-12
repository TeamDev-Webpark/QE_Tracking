import type { IsoDocument } from "@/lib/types";

/** Seed data — copied into the Demo store (.data/db.json) on first run. */
export const seedDocuments: IsoDocument[] = [
  // ============================================================================
  // 1. ฝ่ายประกันคุณภาพ (quality)
  // ============================================================================
  {
    id: "doc-qp-001", code: "QP-QA-001", title: "ขั้นตอนการควบคุมเอกสารและบันทึกคุณภาพ",
    description: "กำหนดวิธีการจัดทำ ทบทวน อนุมัติ แจกจ่าย และยกเลิกเอกสารในระบบคุณภาพ",
    standardId: "iso9001", departmentId: "quality", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "superseded", createdAt: "2026-01-10T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-01-15T02:00:00.000Z", publishedBy: "u1" },
      { version: 2, changeNote: "ปรับปรุงขั้นตอนการอนุมัติเอกสารและเพิ่มแบบฟอร์มคำขอแก้ไข", status: "published", createdAt: "2026-09-01T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-09-15T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: { u2: 1 },
    downloadLog: [{ userId: "u2", version: 2, at: "2026-10-02T03:00:00.000Z" }],
  },
  {
    id: "doc-qp-002", code: "QP-QA-002", title: "ขั้นตอนการตรวจติดตามภายใน (Internal Audit)",
    description: "กำหนดวิธีการวางแผน ดำเนินการ และรายงานผลการตรวจติดตามภายใน",
    standardId: "iso9001", departmentId: "quality", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-02-01T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-02-10T02:00:00.000Z", publishedBy: "u1" },
      { version: 2, changeNote: "เพิ่มเกณฑ์คุณสมบัติผู้ตรวจติดตาม (อยู่ระหว่างทบทวน)", status: "draft", createdAt: "2026-10-25T02:00:00.000Z", createdBy: "u1" },
    ],
    downloadLimit: 2, userLimits: {}, downloadsUsed: { u2: 2 },
    downloadLog: [
      { userId: "u2", version: 1, at: "2026-03-01T03:00:00.000Z" },
      { userId: "u2", version: 1, at: "2026-08-20T03:00:00.000Z" },
    ],
  },
  {
    id: "doc-qp-qa-003", code: "QP-QA-003", title: "ขั้นตอนการจัดการสิ่งที่ไม่เป็นไปตามข้อกำหนดและการปฏิบัติการแก้ไข (NC/CAR)",
    description: "ขั้นตอนการแจ้งข้อบกพร่อง การวิเคราะห์รากเหง้าสาเหตุ และการตรวจยืนยันผลการแก้ไข",
    standardId: "iso9001", departmentId: "quality", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "ประกาศใช้มาตรฐานการจัดการ NC/CAR", status: "published", createdAt: "2026-03-10T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-03-15T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 5, userLimits: {}, downloadsUsed: { u1: 1, u2: 1 },
    downloadLog: [
      { userId: "u1", version: 1, at: "2026-04-02T03:00:00.000Z" },
      { userId: "u2", version: 1, at: "2026-06-12T04:00:00.000Z" },
    ],
  },
  {
    id: "doc-fm-qa-005", code: "FM-QA-005", title: "แบบฟอร์มบันทึกการสอบเทียบ (แบบเดิม)",
    description: "แบบฟอร์มเดิมที่ถูกแทนที่ด้วยระบบบันทึกผลการตรวจ",
    standardId: "iso9001", departmentId: "quality", ownerId: "u1",
    cancelled: { at: "2026-10-01T02:00:00.000Z", by: "u1", reason: "ยกเลิกการใช้งาน เปลี่ยนไปใช้ระบบบันทึกผลการตรวจ" },
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2025-06-01T02:00:00.000Z", createdBy: "u1", publishedAt: "2025-06-05T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 2. ฝ่ายผลิต (production)
  // ============================================================================
  {
    id: "doc-qp-prd-001", code: "QP-PRD-001", title: "ขั้นตอนการวางแผนและควบคุมการผลิต",
    description: "กำหนดขั้นตอนการวางแผนการผลิต การควบคุมพารามิเตอร์เครื่องจักร และการติดตามผลผลิตประจำวัน",
    standardId: "iso9001", departmentId: "production", ownerId: "u3",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "superseded", createdAt: "2026-01-20T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-01-25T02:00:00.000Z", publishedBy: "u1" },
      { version: 2, changeNote: "ปรับปรุงเกณฑ์การควบคุมอุณหภูมิพื้นที่ผลิตและตารางตรวจสอบประจำกะ", status: "published", createdAt: "2026-08-10T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-08-15T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 5, userLimits: {}, downloadsUsed: { u3: 1 },
    downloadLog: [{ userId: "u3", version: 2, at: "2026-10-12T04:00:00.000Z" }],
  },
  {
    id: "doc-wi-prd-010", code: "WI-PRD-010", title: "วิธีการปฏิบัติงานสายการผลิต",
    description: "ขั้นตอนการตั้งค่าเครื่องจักรและตรวจสอบชิ้นงานในสายการผลิต",
    standardId: "iso9001", departmentId: "production", ownerId: "u3",
    versions: [
      { version: 1, changeNote: "ประกาศใช้มาตรฐานการเดินสายการผลิตหลัก", status: "published", createdAt: "2026-05-01T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-05-05T02:00:00.000Z", publishedBy: "u1" },
      { version: 2, changeNote: "ปรับปรุงความเร็วสายพาน Line A และจุดตรวจ First Piece (รออนุมัติประกาศใช้)", status: "draft", createdAt: "2026-11-01T02:00:00.000Z", createdBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: { u3: 1 },
    downloadLog: [{ userId: "u3", version: 1, at: "2026-09-18T03:30:00.000Z" }],
  },
  {
    id: "doc-wi-prd-011", code: "WI-PRD-011", title: "มาตรฐานการตรวจสอบชิ้นงานแรก (First Piece Inspection)",
    description: "วิธีตรวจสอบขนาด น้ำหนัก และความสมบูรณ์ของชิ้นงานตัวอย่างแรกก่อนเริ่มเดินสายการผลิตแต่ละล็อต",
    standardId: "iso9001", departmentId: "production", ownerId: "u3",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-06-10T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-06-15T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: { u3: 2 },
    downloadLog: [
      { userId: "u3", version: 1, at: "2026-07-05T02:00:00.000Z" },
      { userId: "u3", version: 1, at: "2026-10-20T05:00:00.000Z" },
    ],
  },
  {
    id: "doc-fm-prd-005", code: "FM-PRD-005", title: "แบบฟอร์มบันทึกผลการผลิตและของเสียประจำวัน",
    description: "แบบฟอร์มสำหรับหัวหน้ากะและพนักงานฝ่ายผลิตบันทึกยอดผลิตและจำนวนชิ้นงานเสียรายชั่วโมง",
    standardId: "iso9001", departmentId: "production", ownerId: "u3",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-03-01T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-03-05T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 5, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },
  {
    id: "doc-ep-prd-002", code: "EP-PRD-002", title: "วิธีปฏิบัติในการคัดแยกขยะอุตสาหกรรมและควบคุมฝุ่นละอองในพื้นที่ผลิต",
    description: "ข้อกำหนดการคัดแยกเศษวัสดุเหลือใช้จากสายการผลิตและการดูแลระบบดูดฝุ่นในพื้นที่ผสมวัตถุดิบ",
    standardId: "iso14001", departmentId: "production", ownerId: "u3",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรกตามมาตรฐาน ISO 14001", status: "published", createdAt: "2026-04-10T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-04-15T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: { u3: 3 },
    downloadLog: [
      { userId: "u3", version: 1, at: "2026-05-10T02:00:00.000Z" },
      { userId: "u3", version: 1, at: "2026-07-15T02:00:00.000Z" },
      { userId: "u3", version: 1, at: "2026-09-22T02:00:00.000Z" },
    ],
  },

  // ============================================================================
  // 3. ฝ่ายจัดซื้อ (purchasing)
  // ============================================================================
  {
    id: "doc-qp-pur-001", code: "QP-PUR-001", title: "ขั้นตอนการคัดเลือกและประเมินผู้ขายภายนอก (Supplier Evaluation)",
    description: "หลักเกณฑ์การขึ้นทะเบียนผู้ขายรายใหม่ (AVL) และการประเมินเกรดผู้ขายประจำปี",
    standardId: "iso9001", departmentId: "purchasing", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-02-12T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-02-15T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: { u2: 1 },
    downloadLog: [{ userId: "u2", version: 1, at: "2026-05-10T03:00:00.000Z" }],
  },
  {
    id: "doc-ep-pur-002", code: "EP-PUR-002", title: "คู่มือการจัดซื้อสีเขียวและข้อกำหนดสารต้องห้าม (Green Procurement & RoHS)",
    description: "ข้อกำหนดในการจัดซื้อวัสดุที่เป็นมิตรต่อสิ่งแวดล้อมและการตรวจสอบเอกสาร SDS",
    standardId: "iso14001", departmentId: "purchasing", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "ประกาศใช้เกณฑ์ Green Procurement", status: "published", createdAt: "2026-03-20T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-03-25T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 4. ฝ่ายคลังสินค้า (warehouse)
  // ============================================================================
  {
    id: "doc-wi-wh-001", code: "WI-WH-001", title: "วิธีปฏิบัติในการตรวจรับ จัดเก็บ และเบิกจ่ายวัตถุดิบแบบ FIFO",
    description: "ขั้นตอนการตรวจรับสินค้าเข้าคลัง การติดป้ายชี้บ่งล็อต และการควบคุมอุณหภูมิคลังสินค้า",
    standardId: "iso9001", departmentId: "warehouse", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-02-18T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-02-22T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: { u2: 1 },
    downloadLog: [{ userId: "u2", version: 1, at: "2026-06-01T02:00:00.000Z" }],
  },
  {
    id: "doc-ep-wh-002", code: "EP-WH-002", title: "มาตรฐานการจัดเก็บสารเคมีและของเสียอันตรายในพื้นที่คลังสินค้า",
    description: "ข้อกำหนดการใช้ถาดรองรับการรั่วไหล (Secondary Containment) และการแยกประเภทสารเคมี",
    standardId: "iso14001", departmentId: "warehouse", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-04-05T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-04-10T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 5. ฝ่ายซ่อมบำรุง (maintenance)
  // ============================================================================
  {
    id: "doc-qp-mnt-001", code: "QP-MNT-001", title: "ขั้นตอนการวางแผนและดำเนินการบำรุงรักษาเชิงป้องกัน (Preventive Maintenance)",
    description: "กำหนดตารางการตรวจเช็กเครื่องจักรประจำเดือน ประจำปี และขั้นตอนการแจ้งซ่อมฉุกเฉิน",
    standardId: "iso9001", departmentId: "maintenance", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-01-25T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-02-01T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 4, userLimits: {}, downloadsUsed: { u1: 1 },
    downloadLog: [{ userId: "u1", version: 1, at: "2026-07-10T03:00:00.000Z" }],
  },
  {
    id: "doc-ep-mnt-002", code: "EP-MNT-002", title: "คู่มือการจัดการพลังงานและการตรวจสอบระบบท่อส่งลมอัด",
    description: "แนวทางตรวจเช็กรอยรั่วซึมของระบบลมอัดและมาตรการควบคุมการใช้ไฟฟ้าของเครื่องจักรหลัก",
    standardId: "iso14001", departmentId: "maintenance", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-04-12T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-04-18T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 6. ฝ่ายความปลอดภัยและสิ่งแวดล้อม (safety-env)
  // ============================================================================
  {
    id: "doc-ep-001", code: "EP-SHE-001", title: "ขั้นตอนการจัดการของเสียและของเสียอันตราย",
    description: "การคัดแยก จัดเก็บ และส่งกำจัดของเสียตามข้อกำหนดกฎหมาย",
    standardId: "iso14001", departmentId: "safety-env", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-04-01T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-04-05T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 5, userLimits: { u3: 10 }, downloadsUsed: { u3: 4 },
    downloadLog: [
      { userId: "u3", version: 1, at: "2026-05-01T03:00:00.000Z" },
      { userId: "u3", version: 1, at: "2026-06-01T03:00:00.000Z" },
      { userId: "u3", version: 1, at: "2026-07-01T03:00:00.000Z" },
      { userId: "u3", version: 1, at: "2026-08-01T03:00:00.000Z" },
    ],
  },
  {
    id: "doc-ep-she-002", code: "EP-SHE-002", title: "แผนเตรียมความพร้อมและตอบสนองต่อภาวะฉุกเฉินด้านสิ่งแวดล้อมและสารเคมีรั่วไหล",
    description: "ขั้นตอนการระงับเหตุสารเคมีหกรั่วไหล อัคคีภัย และการอพยพหนีไฟประจำปี",
    standardId: "iso14001", departmentId: "safety-env", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-04-20T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-04-25T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 5, userLimits: {}, downloadsUsed: { u2: 1 },
    downloadLog: [{ userId: "u2", version: 1, at: "2026-09-01T02:00:00.000Z" }],
  },

  // ============================================================================
  // 7. ฝ่ายทรัพยากรบุคคล (hr)
  // ============================================================================
  {
    id: "doc-qp-hr-001", code: "QP-HR-001", title: "ขั้นตอนการฝึกอบรมและประเมินความสามารถบุคลากร (Competency & Training)",
    description: "การสำรวจความต้องการฝึกอบรม การจัดทำแผนประจำปี และการประเมินประสิทธิผลหลังอบรม",
    standardId: "iso9001", departmentId: "hr", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-02-05T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-02-10T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },
  {
    id: "doc-sd-hr-002", code: "SD-HR-002", title: "คู่มือการปฐมนิเทศพนักงานใหม่ด้านคุณภาพและความปลอดภัยสิ่งแวดล้อม",
    description: "เอกสารประกอบการอบรมพนักงานใหม่เกี่ยวกับนโยบาย ISO 9001 และ ISO 14001",
    standardId: "iso14001", departmentId: "hr", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-03-12T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-03-18T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 5, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 8. ฝ่ายวิศวกรรม (engineering)
  // ============================================================================
  {
    id: "doc-qp-eng-001", code: "QP-ENG-001", title: "ขั้นตอนการควบคุมการเปลี่ยนแปลงทางวิศวกรรม (Engineering Change Notice - ECN)",
    description: "การทวนสอบ อนุมัติ และแจ้งเวียนการแก้ไขแบบพิมพ์เขียวและพารามิเตอร์กระบวนการผลิต",
    standardId: "iso9001", departmentId: "engineering", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-02-20T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-02-25T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: { u1: 1 },
    downloadLog: [{ userId: "u1", version: 1, at: "2026-08-05T03:00:00.000Z" }],
  },
  {
    id: "doc-wi-eng-002", code: "WI-ENG-002", title: "เกณฑ์การประเมินประสิทธิภาพพลังงานและผลกระทบสิ่งแวดล้อมของเครื่องจักรใหม่",
    description: "มาตรฐานการตรวจรับเครื่องจักรใหม่โดยคำนึงถึงการใช้พลังงานและระดับเสียง",
    standardId: "iso14001", departmentId: "engineering", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-05-10T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-05-15T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 9. ฝ่ายวิจัยและพัฒนา (rd)
  // ============================================================================
  {
    id: "doc-qp-rd-001", code: "QP-RD-001", title: "ขั้นตอนการออกแบบและพัฒนาผลิตภัณฑ์ใหม่ (Product Design & Development)",
    description: "กำหนดขั้นตอนตั้งแต่การวางแผน การทวนสอบ (Verification) และการรับรองผล (Validation)",
    standardId: "iso9001", departmentId: "rd", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-03-01T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-03-08T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },
  {
    id: "doc-ep-rd-002", code: "EP-RD-002", title: "แนวทางการออกแบบเชิงนิเวศเศรษฐกิจ (Eco-Design) และการจัดการของเสียห้องแล็บ",
    description: "มาตรฐานการเลือกใช้วัสดุรีไซเคิลและการจัดการสารเคมีเสื่อมสภาพจากการวิจัย",
    standardId: "iso14001", departmentId: "rd", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-05-18T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-05-22T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 10. ฝ่ายโลจิสติกส์ (logistics)
  // ============================================================================
  {
    id: "doc-wi-log-001", code: "WI-LOG-001", title: "มาตรฐานการตรวจสอบรถขนส่งและการควบคุมอุณหภูมิระหว่างจัดส่ง",
    description: "ขั้นตอนการตรวจเช็กความสะอาด อุณหภูมิตู้คอนเทนเนอร์ และการรัดพาเลทสินค้า",
    standardId: "iso9001", departmentId: "logistics", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-03-15T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-03-20T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },
  {
    id: "doc-ep-log-002", code: "EP-LOG-002", title: "มาตรการลดมลพิษทางอากาศจากการขนส่งและนโยบายดับเครื่องยนต์ขณะจอดรอ",
    description: "ข้อกำหนดการตรวจวัดควันดำรถบรรทุกและการขับขี่ประหยัดพลังงาน (Eco-Driving)",
    standardId: "iso14001", departmentId: "logistics", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-06-01T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-06-05T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 11. ฝ่ายขายและการตลาด (sales)
  // ============================================================================
  {
    id: "doc-qp-sal-001", code: "QP-SAL-001", title: "ขั้นตอนการทบทวนข้อกำหนดของลูกค้าและการรับคำสั่งซื้อ (Contract Review)",
    description: "ขั้นตอนการตรวจสอบสเปกสินค้า กำหนดส่งมอบ และการจัดการกรณีแก้ไขคำสั่งซื้อ",
    standardId: "iso9001", departmentId: "sales", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-02-25T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-03-01T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 12. ฝ่ายเทคโนโลยีสารสนเทศ (it)
  // ============================================================================
  {
    id: "doc-qp-it-001", code: "QP-IT-001", title: "ขั้นตอนการสำรองข้อมูล การกู้คืนระบบ และการควบคุมสิทธิ์ผู้ใช้งาน",
    description: "มาตรฐานการทำ Data Backup รายวัน/รายเดือน และแผนรองรับเหตุฉุกเฉินทางไอที",
    standardId: "iso9001", departmentId: "it", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-01-30T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-02-05T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },
  {
    id: "doc-ep-it-002", code: "EP-IT-002", title: "แนวทางการจัดการขยะอิเล็กทรอนิกส์ (E-Waste) และการประหยัดพลังงานห้อง Server",
    description: "ข้อกำหนดการคัดแยกอุปกรณ์คอมพิวเตอร์เสื่อมสภาพเพื่อส่งกำจัดตามมาตรฐานสิ่งแวดล้อม",
    standardId: "iso14001", departmentId: "it", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-06-12T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-06-18T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 13. ฝ่ายการเงินและบัญชี (finance)
  // ============================================================================
  {
    id: "doc-wi-fin-001", code: "WI-FIN-001", title: "ระเบียบการจัดเก็บเอกสารทางการเงินและการตรวจสอบความถูกต้องของใบแจ้งหนี้",
    description: "การควบคุมความถูกต้องของเอกสารเรียกเก็บเงินและการจัดเก็บเอกสารบัญชีตามระยะเวลากฎหมาย",
    standardId: "iso9001", departmentId: "finance", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-03-05T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-03-10T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 14. ฝ่ายบริการลูกค้า (cs)
  // ============================================================================
  {
    id: "doc-qp-cs-001", code: "QP-CS-001", title: "ขั้นตอนการรับเรื่องร้องเรียนลูกค้าและการสำรวจความพึงพอใจ",
    description: "กำหนดกรอบเวลา SLA ในการตอบกลับลูกค้าและการประสานงานเปิดใบ CAR ร่วมกับฝ่ายประกันคุณภาพ",
    standardId: "iso9001", departmentId: "cs", ownerId: "u2",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-02-28T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-03-05T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 15. ฝ่ายกฎหมายและการกำกับดูแล (legal)
  // ============================================================================
  {
    id: "doc-qp-leg-001", code: "QP-LEG-001", title: "ขั้นตอนการชี้บ่ง ทบทวน และประเมินความสอดคล้องของกฎหมายและข้อบังคับ",
    description: "วิธีการติดตามกฎหมายใหม่ด้านผลิตภัณฑ์ โรงงาน และสิ่งแวดล้อม รวมถึงการต่ออายุใบอนุญาต",
    standardId: "iso14001", departmentId: "legal", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-01-18T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-01-22T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },

  // ============================================================================
  // 16. ฝ่ายวางแผนการผลิต (planning)
  // ============================================================================
  {
    id: "doc-qp-pln-001", code: "QP-PLN-001", title: "ขั้นตอนการจัดทำแผนการผลิตหลัก (MPS) และการออกใบสั่งผลิต (Work Order)",
    description: "การวิเคราะห์กำลังการผลิต ปริมาณสต็อกวัตถุดิบ และการจัดตารางเดินเครื่องจักร",
    standardId: "iso9001", departmentId: "planning", ownerId: "u1",
    versions: [
      { version: 1, changeNote: "จัดทำครั้งแรก", status: "published", createdAt: "2026-02-08T02:00:00.000Z", createdBy: "u1", publishedAt: "2026-02-12T02:00:00.000Z", publishedBy: "u1" },
    ],
    downloadLimit: 3, userLimits: {}, downloadsUsed: {}, downloadLog: [],
  },
];
