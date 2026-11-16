import type { ChecklistItem } from "@/lib/types";

/** Seed data — copied into the Demo store (.data/db.json) on first run. */
export const seedChecklists: ChecklistItem[] = [
  // ============================================================================
  // 1. ฝ่ายประกันคุณภาพ (quality)
  // ============================================================================
  {
    id: "cl-9001-1", standardId: "iso9001", clause: "7.1.5",
    title: "เครื่องมือวัดได้รับการสอบเทียบและอยู่ในกำหนด", departmentId: "quality", type: "pass_fail",
    results: [
      { id: "c8c19966-0508-4ba6-bffd-f60bc8cd47b0", value: false, passed: false, checkedAt: "2026-11-10T03:32:00.000Z", checkedBy: "u1" },
      { id: "r1", value: true, passed: true, checkedAt: "2026-11-03T02:30:00.000Z", checkedBy: "u2" },
    ],
  },
  {
    id: "cl-9001-4", standardId: "iso9001", clause: "7.5.3",
    title: "เอกสารหน้างานเป็นฉบับปัจจุบัน", departmentId: "quality", type: "pass_fail",
    results: [{ id: "ff1f1e77-e339-4c8c-a95e-33cb41d52540", value: true, passed: true, checkedAt: "2026-11-09T10:32:00.000Z", checkedBy: "u1" }],
  },
  {
    id: "cl-9001-6", standardId: "iso9001", clause: "7.2",
    title: "ร้อยละพนักงานตรวจสอบคุณภาพที่ผ่านการประเมินทักษะ (QMS Skill Matrix)", departmentId: "quality", type: "numeric",
    criteria: { operator: "gte", min: 85, unit: "%" },
    results: [{ id: "r9", value: 92, passed: true, checkedAt: "2026-11-05T09:00:00.000Z", checkedBy: "u1" }],
  },
  {
    id: "cl-9001-7", standardId: "iso9001", clause: "8.2.1",
    title: "คะแนนความพึงพอใจของลูกค้าด้านคุณภาพสินค้าประจำไตรมาส", departmentId: "quality", type: "numeric",
    criteria: { operator: "gte", min: 80, unit: "%" },
    results: [{ id: "r10", value: 88.5, passed: true, checkedAt: "2026-11-04T10:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-11", standardId: "iso9001", clause: "9.2",
    title: "การดำเนินการตรวจติดตามคุณภาพภายใน (Internal Quality Audit) ตามแผนประจำปี", departmentId: "quality", type: "pass_fail",
    results: [{ id: "r-qa-iqa-1", value: true, passed: true, checkedAt: "2026-11-07T02:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-12", standardId: "iso9001", clause: "10.2",
    title: "อัตราการปิดข้อบกพร่อง NC/CAR ภายในกำหนดเวลา", departmentId: "quality", type: "numeric",
    criteria: { operator: "gte", min: 95, unit: "%" },
    results: [{ id: "r14", value: 83.3, passed: false, checkedAt: "2026-11-06T07:20:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-qa-extra-1", standardId: "iso9001", clause: "8.6",
    title: "ความครบถ้วนของบันทึกการตรวจปล่อยสินค้าสำเร็จรูป (Final Inspection Release)", departmentId: "quality", type: "pass_fail",
    results: [],
  },
  {
    id: "cl-14001-5", standardId: "iso14001", clause: "7.5",
    title: "เอกสารระบบการจัดการสิ่งแวดล้อมได้รับการควบคุมและเป็นฉบับปัจจุบัน", departmentId: "quality", type: "pass_fail",
    results: [{ id: "r6", value: true, passed: true, checkedAt: "2026-11-01T03:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-6", standardId: "iso14001", clause: "9.1.2",
    title: "ร้อยละของข้อกำหนดกฎหมายสิ่งแวดล้อมที่ประเมินความสอดคล้องแล้ว", departmentId: "quality", type: "numeric",
    criteria: { operator: "gte", min: 90, unit: "%" },
    results: [
      { id: "a651bceb-6c20-4745-9629-613b016d95dd", value: 90, passed: true, checkedAt: "2026-11-10T04:28:21.926Z", checkedBy: "u1" },
      { id: "r7", value: 80, passed: false, checkedAt: "2026-11-05T06:30:00.000Z", checkedBy: "u2" },
    ],
  },
  {
    id: "cl-14001-qa-extra-1", standardId: "iso14001", clause: "9.3",
    title: "การจัดทำรายงานทบทวนฝ่ายบริหารด้านสิ่งแวดล้อม (EMS Management Review)", departmentId: "quality", type: "pass_fail",
    results: [],
  },

  // ============================================================================
  // 2. ฝ่ายผลิต (production)
  // ============================================================================
  {
    id: "cl-9001-2", standardId: "iso9001", clause: "7.1.4",
    title: "อุณหภูมิพื้นที่ผลิต", departmentId: "production", type: "numeric",
    criteria: { operator: "between", min: 20, max: 25, unit: "°C" },
    results: [{ id: "r2", value: 27.5, passed: false, checkedAt: "2026-11-04T03:15:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-3", standardId: "iso9001", clause: "8.7",
    title: "อัตราของเสียจากสายการผลิต", departmentId: "production", type: "numeric",
    criteria: { operator: "lte", max: 2, unit: "%" },
    results: [{ id: "r3", value: 1.4, passed: true, checkedAt: "2026-11-05T08:00:00.000Z", checkedBy: "u1" }],
  },
  {
    id: "cl-9001-9", standardId: "iso9001", clause: "8.5.2",
    title: "การชี้บ่งสถานะและการสอบกลับได้ของผลิตภัณฑ์ในกระบวนการ", departmentId: "production", type: "pass_fail",
    results: [{ id: "r12", value: true, passed: true, checkedAt: "2026-11-05T05:45:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "3e962e88-1bde-474d-a315-9f05fc3fd3d2", standardId: "iso9001", clause: "7.1.5",
    title: "คุณภาพสินค้า", departmentId: "production", type: "pass_fail",
    results: [{ id: "r-prd-qual-1", value: true, passed: true, checkedAt: "2026-11-10T04:13:41.239Z", checkedBy: "u1", note: "ตรวจยืนยันหลังแก้ไข CAR-2026-008 ผ่านมาตรฐาน" }],
  },
  {
    id: "cl-9001-prd-1", standardId: "iso9001", clause: "7.1.3",
    title: "การตรวจสอบความพร้อมเครื่องจักรประจำวันก่อนเดินสายการผลิต (Daily Machine Check)", departmentId: "production", type: "pass_fail",
    results: [{ id: "r-prd-mc-1", value: true, passed: true, checkedAt: "2026-11-08T01:30:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-prd-2", standardId: "iso9001", clause: "8.5.1",
    title: "ความเร็วรอบสายพานลำเลียงสายการผลิตหลัก (Line A)", departmentId: "production", type: "numeric",
    criteria: { operator: "between", min: 40, max: 50, unit: "ชิ้น/นาที" },
    results: [{ id: "r-prd-spd-1", value: 45, passed: true, checkedAt: "2026-11-08T02:15:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-prd-3", standardId: "iso9001", clause: "8.5.1",
    title: "การตรวจสอบชิ้นงานตัวอย่างชิ้นแรกก่อนผลิตจริง (First Piece Inspection)", departmentId: "production", type: "pass_fail",
    results: [{ id: "r-prd-fpi-1", value: false, passed: false, checkedAt: "2026-11-07T03:00:00.000Z", checkedBy: "u2", note: "กะเช้าเดินเครื่องก่อนลงบันทึกใบ First Piece" }],
  },
  {
    id: "cl-9001-prd-4", standardId: "iso9001", clause: "8.5.5",
    title: "การตรวจสอบความถูกต้องของฉลากและบรรจุภัณฑ์ก่อนส่งเข้าคลัง", departmentId: "production", type: "pass_fail",
    results: [],
  },
  {
    id: "cl-14001-8", standardId: "iso14001", clause: "8.1",
    title: "การคัดแยกขยะอุตสาหกรรมและขยะรีไซเคิลตามมาตรฐาน", departmentId: "production", type: "pass_fail",
    results: [{ id: "r16", value: true, passed: true, checkedAt: "2026-11-06T03:10:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-prd-1", standardId: "iso14001", clause: "6.1.2",
    title: "ระดับเสียงรบกวนในพื้นที่สายการผลิตปั๊มขึ้นรูป", departmentId: "production", type: "numeric",
    criteria: { operator: "lte", max: 85, unit: "dBA" },
    results: [{ id: "r-prd-env-1", value: 82.5, passed: true, checkedAt: "2026-11-07T04:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-prd-2", standardId: "iso14001", clause: "8.1",
    title: "ปริมาณฝุ่นละอองในพื้นที่ผสมวัตถุดิบ", departmentId: "production", type: "numeric",
    criteria: { operator: "lte", max: 10, unit: "mg/m³" },
    results: [{ id: "r-prd-env-2", value: 12.4, passed: false, checkedAt: "2026-10-25T05:00:00.000Z", checkedBy: "u2", note: "แผ่นกรองเครื่องดูดฝุ่นโซนผสมอุดตัน" }],
  },
  {
    id: "cl-14001-prd-3", standardId: "iso14001", clause: "8.2",
    title: "ความพร้อมใช้งานของถังดับเพลิงและจุดล้างตาฉุกเฉินในพื้นที่ผลิต", departmentId: "production", type: "pass_fail",
    results: [{ id: "r-prd-env-3", value: true, passed: true, checkedAt: "2026-11-08T03:30:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-prd-4", standardId: "iso14001", clause: "9.1.1",
    title: "อัตราการใช้น้ำมันหล่อลื่นเครื่องจักรต่อล็อตการผลิต", departmentId: "production", type: "numeric",
    criteria: { operator: "lte", max: 15, unit: "ลิตร" },
    results: [],
  },

  // ============================================================================
  // 3. ฝ่ายจัดซื้อ (purchasing)
  // ============================================================================
  {
    id: "cl-9001-purchasing", standardId: "iso9001", clause: "8.4.1",
    title: "การประเมินและคัดเลือกผู้ขายรายใหม่และประจำปี (Approved Vendor List)", departmentId: "purchasing", type: "pass_fail",
    results: [{ id: "r-pur-1", value: true, passed: true, checkedAt: "2026-11-05T04:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-pur-2", standardId: "iso9001", clause: "8.4.2",
    title: "อัตราการส่งมอบวัตถุดิบตรงเวลาของผู้ขายหลัก (Supplier On-Time Delivery)", departmentId: "purchasing", type: "numeric",
    criteria: { operator: "gte", min: 95, unit: "%" },
    results: [{ id: "r-pur-2", value: 96.4, passed: true, checkedAt: "2026-11-06T03:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-pur-3", standardId: "iso9001", clause: "8.4.3",
    title: "ความครบถ้วนของการระบุสเปกและข้อกำหนดคุณภาพในใบสั่งซื้อ (PO Specification)", departmentId: "purchasing", type: "pass_fail",
    results: [{ id: "r-pur-3", value: false, passed: false, checkedAt: "2026-11-07T05:00:00.000Z", checkedBy: "u2", note: "พบ PO สั่งซื้อเม็ดพลาสติก 2 ใบไม่ระบุเกรด RoHS" }],
  },
  {
    id: "cl-9001-pur-4", standardId: "iso9001", clause: "8.4.1",
    title: "การตรวจติดตามระบบคุณภาพผู้รับเหมาช่วงประจำปี (Supplier Audit)", departmentId: "purchasing", type: "pass_fail",
    results: [],
  },
  {
    id: "cl-14001-pur-1", standardId: "iso14001", clause: "8.1",
    title: "การจัดซื้อสารเคมีและวัสดุที่เป็นมิตรต่อสิ่งแวดล้อม (Green Procurement)", departmentId: "purchasing", type: "pass_fail",
    results: [{ id: "r-pur-env-1", value: true, passed: true, checkedAt: "2026-11-06T06:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-pur-2", standardId: "iso14001", clause: "8.1",
    title: "การเรียกเก็บเอกสารข้อมูลความปลอดภัยสารเคมี (SDS) จากผู้ขายครบทุกรายการ", departmentId: "purchasing", type: "numeric",
    criteria: { operator: "gte", min: 100, unit: "%" },
    results: [{ id: "r-pur-env-2", value: 100, passed: true, checkedAt: "2026-11-07T06:30:00.000Z", checkedBy: "u1" }],
  },

  // ============================================================================
  // 4. ฝ่ายคลังสินค้า (warehouse)
  // ============================================================================
  {
    id: "cl-9001-8", standardId: "iso9001", clause: "8.4.2",
    title: "การตรวจสอบและตรวจรับวัตถุดิบนำเข้าตามสเปก (Incoming Inspection)", departmentId: "warehouse", type: "pass_fail",
    results: [{ id: "r11", value: true, passed: true, checkedAt: "2026-11-06T02:30:00.000Z", checkedBy: "u3" }],
  },
  {
    id: "cl-9001-10", standardId: "iso9001", clause: "8.5.4",
    title: "อุณหภูมิห้องจัดเก็บสินค้าสำเร็จรูป", departmentId: "warehouse", type: "numeric",
    criteria: { operator: "lte", max: 25, unit: "°C" },
    results: [{ id: "r13", value: 22.8, passed: true, checkedAt: "2026-11-06T06:00:00.000Z", checkedBy: "u3" }],
  },
  {
    id: "cl-9001-wh-3", standardId: "iso9001", clause: "8.5.4",
    title: "การเบิกจ่ายวัตถุดิบตามหลักเข้าก่อน-ออกก่อน (FIFO Control)", departmentId: "warehouse", type: "pass_fail",
    results: [{ id: "r-wh-3", value: true, passed: true, checkedAt: "2026-11-07T02:30:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-wh-4", standardId: "iso9001", clause: "8.5.2",
    title: "ความแม่นยำของยอดคงคลังจากการตรวจนับสต็อกประจำเดือน (Inventory Accuracy)", departmentId: "warehouse", type: "numeric",
    criteria: { operator: "gte", min: 99, unit: "%" },
    results: [],
  },
  {
    id: "cl-14001-2", standardId: "iso14001", clause: "8.1",
    title: "จัดเก็บของเสียอันตรายในพื้นที่ที่กำหนด", departmentId: "warehouse", type: "pass_fail",
    results: [{ id: "r5", value: false, passed: false, checkedAt: "2026-11-04T07:45:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-wh-2", standardId: "iso14001", clause: "8.2",
    title: "ความพร้อมของถาดรองรับการรั่วไหล (Secondary Containment) ในคลังสารเคมี", departmentId: "warehouse", type: "pass_fail",
    results: [{ id: "r-wh-env-2", value: true, passed: true, checkedAt: "2026-11-07T03:15:00.000Z", checkedBy: "u2" }],
  },

  // ============================================================================
  // 5. ฝ่ายซ่อมบำรุง (maintenance)
  // ============================================================================
  {
    id: "cl-9001-5", standardId: "iso9001", clause: "7.1.3",
    title: "ความพร้อมและการบำรุงรักษาเชิงป้องกันเครื่องจักร (PM)", departmentId: "maintenance", type: "pass_fail",
    results: [{ id: "r8", value: true, passed: true, checkedAt: "2026-11-06T04:15:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-mnt-2", standardId: "iso9001", clause: "7.1.3",
    title: "ระยะเวลาเฉลี่ยในการซ่อมเครื่องจักรฉุกเฉิน (MTTR)", departmentId: "maintenance", type: "numeric",
    criteria: { operator: "lte", max: 4, unit: "ชั่วโมง" },
    results: [{ id: "r-mnt-2", value: 2.5, passed: true, checkedAt: "2026-11-07T04:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-mnt-3", standardId: "iso9001", clause: "7.1.3",
    title: "ความครบถ้วนของบันทึกการบำรุงรักษาเครื่องอัดอากาศประจำเดือน", departmentId: "maintenance", type: "pass_fail",
    results: [{ id: "r-mnt-3", value: false, passed: false, checkedAt: "2026-11-06T02:30:00.000Z", checkedBy: "u1", note: "เครื่องอัดอากาศหมายเลข 3 ขาดบันทึกเดือนตุลาคม" }],
  },
  {
    id: "cl-14001-3", standardId: "iso14001", clause: "9.1.1",
    title: "ปริมาณการใช้ไฟฟ้ารายเดือน", departmentId: "maintenance", type: "numeric",
    criteria: { operator: "lte", max: 50000, unit: "kWh" },
    results: [{ id: "r-mnt-env-1", value: 48200, passed: true, checkedAt: "2026-11-08T01:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-10", standardId: "iso14001", clause: "9.1.1",
    title: "ปริมาณการใช้น้ำประปาในกระบวนการผลิต", departmentId: "maintenance", type: "numeric",
    criteria: { operator: "lte", max: 3000, unit: "m³" },
    results: [{ id: "r18", value: 2850, passed: true, checkedAt: "2026-11-06T08:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-mnt-3", standardId: "iso14001", clause: "8.1",
    title: "การตรวจสอบการรั่วซึมของระบบท่อส่งลมและสารทำความเย็น", departmentId: "maintenance", type: "pass_fail",
    results: [],
  },

  // ============================================================================
  // 6. ฝ่ายความปลอดภัยและสิ่งแวดล้อม (safety-env)
  // ============================================================================
  {
    id: "cl-9001-she-1", standardId: "iso9001", clause: "7.1.4",
    title: "ความเข้มแสงสว่างในพื้นที่ตรวจสอบคุณภาพและสายการผลิต", departmentId: "safety-env", type: "numeric",
    criteria: { operator: "gte", min: 500, unit: "Lux" },
    results: [{ id: "r-she-1", value: 620, passed: true, checkedAt: "2026-11-05T03:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-1", standardId: "iso14001", clause: "6.1.2",
    title: "ค่า pH ของน้ำทิ้งก่อนปล่อยออก", departmentId: "safety-env", type: "numeric",
    criteria: { operator: "between", min: 5.5, max: 9, unit: "pH" },
    results: [
      { id: "4f04cf98-0209-4ec9-9904-9536d0e6f753", value: 10, passed: false, checkedAt: "2026-11-10T03:33:00.000Z", checkedBy: "u1" },
      { id: "r4", value: 7.2, passed: true, checkedAt: "2026-11-02T04:00:00.000Z", checkedBy: "u2" },
    ],
  },
  {
    id: "cl-14001-4", standardId: "iso14001", clause: "8.2",
    title: "มีชุดอุปกรณ์จัดการสารเคมีหกรั่วไหล (Spill Kit) พร้อมใช้งานครบทุกจุด", departmentId: "safety-env", type: "pass_fail",
    results: [{ id: "r-she-2", value: true, passed: true, checkedAt: "2026-11-07T02:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-7", standardId: "iso14001", clause: "6.1.3",
    title: "ทะเบียนกฎหมายสิ่งแวดล้อมและการประเมินความสอดคล้อง", departmentId: "safety-env", type: "pass_fail",
    results: [{ id: "r15", value: true, passed: true, checkedAt: "2026-11-05T08:30:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-9", standardId: "iso14001", clause: "8.2",
    title: "การฝึกซ้อมแผนเผชิญเหตุฉุกเฉินและอัคคีภัยประจำปี", departmentId: "safety-env", type: "pass_fail",
    results: [{ id: "r17", value: true, passed: true, checkedAt: "2026-11-02T09:00:00.000Z", checkedBy: "u1" }],
  },
  {
    id: "cl-14001-11", standardId: "iso14001", clause: "9.1.2",
    title: "ระดับความเข้มข้นสารอินทรีย์ระเหยง่าย (VOCs) ในพื้นที่พ่นสี", departmentId: "safety-env", type: "numeric",
    criteria: { operator: "lte", max: 100, unit: "ppm" },
    results: [{ id: "r19", value: 118, passed: false, checkedAt: "2026-11-06T09:30:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-12", standardId: "iso14001", clause: "10.2",
    title: "การจัดการข้อร้องเรียนด้านสิ่งแวดล้อมจากชุมชนโดยรอบ", departmentId: "safety-env", type: "pass_fail",
    results: [],
  },

  // ============================================================================
  // 7. ฝ่ายทรัพยากรบุคคล (hr)
  // ============================================================================
  {
    id: "cl-9001-hr", standardId: "iso9001", clause: "7.2",
    title: "ความเพียงพอของแผนการฝึกอบรมประจำปีและบันทึกประวัติการอบรมพนักงาน", departmentId: "hr", type: "numeric",
    criteria: { operator: "gte", min: 85, unit: "%" },
    results: [{ id: "r-hr-1", value: 92, passed: true, checkedAt: "2026-11-05T05:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-hr-2", standardId: "iso9001", clause: "7.1.2",
    title: "การปฐมนิเทศพนักงานใหม่ด้านระบบบริหารงานคุณภาพ ISO 9001 ครบ 100%", departmentId: "hr", type: "numeric",
    criteria: { operator: "gte", min: 100, unit: "%" },
    results: [{ id: "r-hr-2", value: 100, passed: true, checkedAt: "2026-11-06T04:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-hr-3", standardId: "iso9001", clause: "7.3",
    title: "การประเมินความตระหนักรู้ด้านนโยบายคุณภาพของพนักงานประจำปี", departmentId: "hr", type: "pass_fail",
    results: [{ id: "r-hr-3", value: false, passed: false, checkedAt: "2026-11-07T03:00:00.000Z", checkedBy: "u2", note: "พนักงานกะดึก 4 คนยังไม่ได้ทำแบบทดสอบความตระหนักรู้" }],
  },
  {
    id: "cl-14001-hr-1", standardId: "iso14001", clause: "7.2",
    title: "การฝึกอบรมหลักสูตรการคัดแยกขยะและการตอบสนองเหตุสารเคมีรั่วไหล", departmentId: "hr", type: "pass_fail",
    results: [{ id: "r-hr-env-1", value: true, passed: true, checkedAt: "2026-11-06T05:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-hr-2", standardId: "iso14001", clause: "7.3",
    title: "การสื่อสารนโยบายสิ่งแวดล้อมและเป้าหมายลดพลังงานแก่พนักงานทุกแผนก", departmentId: "hr", type: "pass_fail",
    results: [],
  },

  // ============================================================================
  // 8. ฝ่ายวิศวกรรม (engineering)
  // ============================================================================
  {
    id: "cl-9001-engineering", standardId: "iso9001", clause: "8.3.6",
    title: "การควบคุมและอนุมัติการเปลี่ยนแปลงแบบร่างทางวิศวกรรม (ECN Control)", departmentId: "engineering", type: "pass_fail",
    results: [{ id: "r-eng-1", value: true, passed: true, checkedAt: "2026-11-06T02:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-eng-2", standardId: "iso9001", clause: "8.5.1",
    title: "การทวนสอบพารามิเตอร์แม่พิมพ์และจิ๊กฟิกซ์เจอร์ก่อนส่งมอบให้ฝ่ายผลิต", departmentId: "engineering", type: "pass_fail",
    results: [{ id: "r-eng-2", value: true, passed: true, checkedAt: "2026-11-07T02:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-eng-3", standardId: "iso9001", clause: "7.5.3",
    title: "การควบคุมแบบพิมพ์เขียว (Master Drawing) และการเรียกคืนแบบฉบับยกเลิก", departmentId: "engineering", type: "pass_fail",
    results: [],
  },
  {
    id: "cl-14001-eng-1", standardId: "iso14001", clause: "8.1",
    title: "การประเมินผลกระทบสิ่งแวดล้อมก่อนติดตั้งเครื่องจักรหรือดัดแปลงกระบวนการใหม่", departmentId: "engineering", type: "pass_fail",
    results: [{ id: "r-eng-env-1", value: true, passed: true, checkedAt: "2026-11-07T04:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-eng-2", standardId: "iso14001", clause: "6.1.2",
    title: "ประสิทธิภาพการใช้พลังงานของระบบทำความเย็นใหม่ (Chiller COP)", departmentId: "engineering", type: "numeric",
    criteria: { operator: "gte", min: 4.5, unit: "COP" },
    results: [{ id: "r-eng-env-2", value: 4.8, passed: true, checkedAt: "2026-11-08T02:00:00.000Z", checkedBy: "u1" }],
  },

  // ============================================================================
  // 9. ฝ่ายวิจัยและพัฒนา (rd)
  // ============================================================================
  {
    id: "cl-9001-rd", standardId: "iso9001", clause: "8.3.4",
    title: "การทวนสอบและรับรองความถูกต้องของผลงานการออกแบบผลิตภัณฑ์ใหม่ (Design Verification)", departmentId: "rd", type: "pass_fail",
    results: [{ id: "r-rd-1", value: false, passed: false, checkedAt: "2026-11-06T03:30:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-rd-2", standardId: "iso9001", clause: "8.3.2",
    title: "ความครบถ้วนของแผนการออกแบบและพัฒนาผลิตภัณฑ์ใหม่ (Design Plan)", departmentId: "rd", type: "pass_fail",
    results: [{ id: "r-rd-2", value: true, passed: true, checkedAt: "2026-11-06T05:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-rd-3", standardId: "iso9001", clause: "8.3.5",
    title: "การทดสอบอายุการใช้งานผลิตภัณฑ์ต้นแบบ (Prototype Reliability Test)", departmentId: "rd", type: "numeric",
    criteria: { operator: "gte", min: 1000, unit: "ชั่วโมง" },
    results: [{ id: "r-rd-3", value: 1200, passed: true, checkedAt: "2026-11-07T06:00:00.000Z", checkedBy: "u1" }],
  },
  {
    id: "cl-14001-rd-1", standardId: "iso14001", clause: "8.1",
    title: "การออกแบบผลิตภัณฑ์โดยคำนึงถึงวัฏจักรชีวิตและลดการใช้สารอันตราย (Eco-Design / RoHS)", departmentId: "rd", type: "pass_fail",
    results: [{ id: "r-rd-env-1", value: true, passed: true, checkedAt: "2026-11-07T07:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-rd-2", standardId: "iso14001", clause: "8.1",
    title: "การจัดการของเสียจากการทดลองในห้องปฏิบัติการ R&D", departmentId: "rd", type: "pass_fail",
    results: [],
  },

  // ============================================================================
  // 10. ฝ่ายโลจิสติกส์ (logistics)
  // ============================================================================
  {
    id: "cl-9001-logistics", standardId: "iso9001", clause: "8.5.4",
    title: "การตรวจสอบสภาพตู้คอนเทนเนอร์และอุณหภูมิควบคุมขณะขนส่งสินค้า", departmentId: "logistics", type: "numeric",
    criteria: { operator: "lte", max: 25, unit: "°C" },
    results: [{ id: "r-log-1", value: 23.5, passed: true, checkedAt: "2026-11-06T06:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-log-2", standardId: "iso9001", clause: "8.5.1",
    title: "อัตราการจัดส่งสินค้าถึงมือลูกค้าตรงตามกำหนดเวลา (On-Time Delivery)", departmentId: "logistics", type: "numeric",
    criteria: { operator: "gte", min: 98, unit: "%" },
    results: [{ id: "r-log-2", value: 98.6, passed: true, checkedAt: "2026-11-07T03:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-log-3", standardId: "iso9001", clause: "8.5.4",
    title: "ความสมบูรณ์ของการรัดพาเลทและป้องกันความเสียหายระหว่างขนส่ง", departmentId: "logistics", type: "pass_fail",
    results: [],
  },
  {
    id: "cl-14001-log-1", standardId: "iso14001", clause: "6.1.2",
    title: "ค่าควันดำของรถบรรทุกขนส่งสินค้าตามเกณฑ์กรมควบคุมมลพิษ", departmentId: "logistics", type: "numeric",
    criteria: { operator: "lte", max: 30, unit: "%" },
    results: [{ id: "r-log-env-1", value: 18, passed: true, checkedAt: "2026-11-07T05:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-log-2", standardId: "iso14001", clause: "8.1",
    title: "การปฏิบัติตามมาตรการดับเครื่องยนต์ขณะจอดรอขึ้นสินค้า (Anti-Idling Policy)", departmentId: "logistics", type: "pass_fail",
    results: [{ id: "r-log-env-2", value: true, passed: true, checkedAt: "2026-11-08T02:00:00.000Z", checkedBy: "u2" }],
  },

  // ============================================================================
  // 11. ฝ่ายขายและการตลาด (sales)
  // ============================================================================
  {
    id: "cl-9001-sales", standardId: "iso9001", clause: "8.2.3",
    title: "การทบทวนข้อกำหนดผลิตภัณฑ์ในสัญญาและใบสั่งซื้อก่อนยืนยันรับออเดอร์", departmentId: "sales", type: "pass_fail",
    results: [{ id: "r-sale-1", value: true, passed: true, checkedAt: "2026-11-07T01:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-sal-2", standardId: "iso9001", clause: "8.2.1",
    title: "ความถูกต้องและเป็นปัจจุบันของแคตตาล็อกและเอกสารสเปกสินค้าที่ส่งให้ลูกค้า", departmentId: "sales", type: "pass_fail",
    results: [{ id: "r-sale-2", value: true, passed: true, checkedAt: "2026-11-07T04:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-sal-3", standardId: "iso9001", clause: "8.2.4",
    title: "การแจ้งและบันทึกการเปลี่ยนแปลงคำสั่งซื้อของลูกค้า (Order Amendment)", departmentId: "sales", type: "pass_fail",
    results: [],
  },
  {
    id: "cl-14001-sal-1", standardId: "iso14001", clause: "7.4",
    title: "การสื่อสารข้อมูลฉลากสิ่งแวดล้อมและมาตรฐานผลิตภัณฑ์สีเขียวแก่ลูกค้า", departmentId: "sales", type: "pass_fail",
    results: [{ id: "r-sale-env-1", value: true, passed: true, checkedAt: "2026-11-08T01:30:00.000Z", checkedBy: "u2" }],
  },

  // ============================================================================
  // 12. ฝ่ายเทคโนโลยีสารสนเทศ (it)
  // ============================================================================
  {
    id: "cl-9001-it", standardId: "iso9001", clause: "7.1.3",
    title: "ความสมบูรณ์ของการสำรองข้อมูลระบบสารสนเทศ (Data Backup) และทดสอบกู้คืนประจำเดือน", departmentId: "it", type: "pass_fail",
    results: [{ id: "r-it-1", value: true, passed: true, checkedAt: "2026-11-07T02:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-it-2", standardId: "iso9001", clause: "7.1.3",
    title: "ความพร้อมใช้งานของระบบเครือข่ายและเซิร์ฟเวอร์ (System Uptime)", departmentId: "it", type: "numeric",
    criteria: { operator: "gte", min: 99.5, unit: "%" },
    results: [{ id: "r-it-2", value: 99.9, passed: true, checkedAt: "2026-11-07T05:00:00.000Z", checkedBy: "u1" }],
  },
  {
    id: "cl-9001-it-3", standardId: "iso9001", clause: "7.5.3",
    title: "การทบทวนสิทธิ์การเข้าถึงระบบควบคุมเอกสารและข้อมูลความลับประจำไตรมาส", departmentId: "it", type: "pass_fail",
    results: [],
  },
  {
    id: "cl-14001-it-1", standardId: "iso14001", clause: "8.1",
    title: "การคัดแยกและส่งกำจัดขยะอิเล็กทรอนิกส์ (E-Waste) ผ่านผู้รับกำจัดที่ได้รับอนุญาต", departmentId: "it", type: "pass_fail",
    results: [{ id: "r-it-env-1", value: true, passed: true, checkedAt: "2026-11-08T02:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-it-2", standardId: "iso14001", clause: "6.1.2",
    title: "การควบคุมอุณหภูมิห้อง Server เพื่อประหยัดพลังงานตามเกณฑ์มาตรฐาน", departmentId: "it", type: "numeric",
    criteria: { operator: "between", min: 21, max: 24, unit: "°C" },
    results: [{ id: "r-it-env-2", value: 22.5, passed: true, checkedAt: "2026-11-08T03:00:00.000Z", checkedBy: "u2" }],
  },

  // ============================================================================
  // 13. ฝ่ายการเงินและบัญชี (finance)
  // ============================================================================
  {
    id: "cl-9001-finance", standardId: "iso9001", clause: "7.5.3",
    title: "การจัดเก็บและรักษาความลับของเอกสารธุรกรรมทางการเงินและบันทึกบัญชี", departmentId: "finance", type: "pass_fail",
    results: [{ id: "r-fin-1", value: true, passed: true, checkedAt: "2026-11-07T04:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-fin-2", standardId: "iso9001", clause: "8.2.1",
    title: "ความถูกต้องของการออกใบแจ้งหนี้และใบกำกับภาษีให้ลูกค้า (Billing Accuracy)", departmentId: "finance", type: "numeric",
    criteria: { operator: "gte", min: 99, unit: "%" },
    results: [{ id: "r-fin-2", value: 99.8, passed: true, checkedAt: "2026-11-08T01:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-fin-3", standardId: "iso9001", clause: "7.1.1",
    title: "การอนุมัติงบประมาณสนับสนุนโครงการปรับปรุงคุณภาพและสอบเทียบเครื่องมือ", departmentId: "finance", type: "pass_fail",
    results: [],
  },
  {
    id: "cl-14001-fin-1", standardId: "iso14001", clause: "6.1.2",
    title: "การลดปริมาณการใช้กระดาษด้วยระบบใบแจ้งหนี้อิเล็กทรอนิกส์ (e-Tax Invoice)", departmentId: "finance", type: "pass_fail",
    results: [{ id: "r-fin-env-1", value: true, passed: true, checkedAt: "2026-11-08T02:30:00.000Z", checkedBy: "u2" }],
  },

  // ============================================================================
  // 14. ฝ่ายบริการลูกค้า (cs)
  // ============================================================================
  {
    id: "cl-9001-cs", standardId: "iso9001", clause: "8.2.1",
    title: "อัตราการตอบกลับและแก้ไขปัญหาข้อร้องเรียนลูกค้าภายในกำหนด (SLA Response)", departmentId: "cs", type: "numeric",
    criteria: { operator: "gte", min: 90, unit: "%" },
    results: [{ id: "r-cs-1", value: 88, passed: false, checkedAt: "2026-11-08T02:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-cs-2", standardId: "iso9001", clause: "9.1.2",
    title: "การติดตามผลความพึงพอใจของลูกค้าภายหลังการปิดข้อร้องเรียน (Post-Case Survey)", departmentId: "cs", type: "numeric",
    criteria: { operator: "gte", min: 85, unit: "%" },
    results: [{ id: "r-cs-2", value: 91, passed: true, checkedAt: "2026-11-08T04:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-cs-3", standardId: "iso9001", clause: "10.2",
    title: "ความครบถ้วนของการบันทึกประวัติข้อร้องเรียนลูกค้าและการส่งต่อให้ฝ่ายประกันคุณภาพ", departmentId: "cs", type: "pass_fail",
    results: [{ id: "r-cs-3", value: true, passed: true, checkedAt: "2026-11-08T05:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-cs-1", standardId: "iso14001", clause: "7.4.2",
    title: "การรับเรื่องและประสานงานข้อซักถามด้านสิ่งแวดล้อมจากลูกค้าและภายนอก", departmentId: "cs", type: "pass_fail",
    results: [],
  },

  // ============================================================================
  // 15. ฝ่ายกฎหมายและการกำกับดูแล (legal)
  // ============================================================================
  {
    id: "cl-9001-legal", standardId: "iso9001", clause: "4.2",
    title: "การทบทวนและขึ้นทะเบียนกฎหมายและข้อบังคับที่เกี่ยวข้องกับผลิตภัณฑ์ประจำปี", departmentId: "legal", type: "pass_fail",
    results: [{ id: "r-leg-1", value: true, passed: true, checkedAt: "2026-11-08T03:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-leg-2", standardId: "iso9001", clause: "8.2.3",
    title: "การตรวจสอบความถูกต้องของข้อสัญญาจ้างผลิตและข้อตกลงรักษาความลับ (NDA)", departmentId: "legal", type: "pass_fail",
    results: [{ id: "r-leg-2", value: true, passed: true, checkedAt: "2026-11-08T04:30:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-14001-leg-1", standardId: "iso14001", clause: "6.1.3",
    title: "การต่ออายุใบอนุญาตประกอบกิจการโรงงานและใบอนุญาตนำสิ่งปฏิกูลออกนอกบริเวณโรงงาน", departmentId: "legal", type: "pass_fail",
    results: [{ id: "r-leg-env-1", value: true, passed: true, checkedAt: "2026-11-08T06:00:00.000Z", checkedBy: "u1" }],
  },
  {
    id: "cl-14001-leg-2", standardId: "iso14001", clause: "9.1.2",
    title: "การส่งรายงานการตรวจวัดคุณภาพสิ่งแวดล้อมประจำปีต่อหน่วยงานราชการตามกำหนด", departmentId: "legal", type: "pass_fail",
    results: [],
  },

  // ============================================================================
  // 16. ฝ่ายวางแผนการผลิต (planning)
  // ============================================================================
  {
    id: "cl-9001-planning", standardId: "iso9001", clause: "8.1",
    title: "ความสอดคล้องระหว่างแผนการผลิตหลัก (MPS) และปริมาณวัตถุดิบคงคลังสำรอง", departmentId: "planning", type: "pass_fail",
    results: [{ id: "r-plan-1", value: true, passed: true, checkedAt: "2026-11-08T05:00:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-pln-2", standardId: "iso9001", clause: "8.1",
    title: "ความแม่นยำของการวางแผนกำลังการผลิตรายสัปดาห์ (Production Schedule Adherence)", departmentId: "planning", type: "numeric",
    criteria: { operator: "gte", min: 90, unit: "%" },
    results: [{ id: "r-plan-2", value: 93.5, passed: true, checkedAt: "2026-11-08T06:30:00.000Z", checkedBy: "u2" }],
  },
  {
    id: "cl-9001-pln-3", standardId: "iso9001", clause: "8.5.2",
    title: "การออกใบสั่งผลิต (Work Order) พร้อมระบุหมายเลขล็อตและรหัสสูตรการผลิตครบถ้วน", departmentId: "planning", type: "pass_fail",
    results: [],
  },
  {
    id: "cl-14001-pln-1", standardId: "iso14001", clause: "8.1",
    title: "การจัดตารางเดินเครื่องจักรกลุ่มใช้พลังงานสูงหลีกเลี่ยงช่วง Peak Load", departmentId: "planning", type: "pass_fail",
    results: [{ id: "r-plan-env-1", value: true, passed: true, checkedAt: "2026-11-08T07:00:00.000Z", checkedBy: "u2" }],
  },
];
