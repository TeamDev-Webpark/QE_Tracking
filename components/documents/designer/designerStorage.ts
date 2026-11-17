import type { FormField, FormTemplate, FormSubmission } from "./types";

const TEMPLATES_KEY = "qe_document_form_templates_v1";
const SUBMISSIONS_KEY = "qe_document_form_submissions_v1";

export const DEFAULT_PALETTE_ITEMS: {
  type: FormField["type"];
  label: string;
  shortLabel: string;
  category: "input" | "selection" | "layout";
  icon: string;
  description: string;
  defaultField: Omit<FormField, "id">;
}[] = [
  {
    type: "text",
    label: "ข้อความสั้น (Text Input)",
    shortLabel: "ข้อความสั้น",
    category: "input",
    icon: "🔤",
    description: "ช่องกรอกชื่อ, รหัส, หมายเลขเครื่อง",
    defaultField: {
      type: "text",
      label: "ชื่อรายการ / หมายเลขเครื่อง (Item / Machine No.)",
      placeholder: "กรอกข้อความที่นี่...",
      width: "half",
      required: true,
    },
  },
  {
    type: "textarea",
    label: "ข้อความยาว (Textarea)",
    shortLabel: "ข้อความยาว",
    category: "input",
    icon: "📝",
    description: "บันทึกรายละเอียด, ผลการวิเคราะห์",
    defaultField: {
      type: "textarea",
      label: "รายละเอียดผลการตรวจ / ข้อสังเกต (Observations)",
      placeholder: "ระบุรายละเอียดผลการดำเนินงาน...",
      width: "full",
      required: false,
    },
  },
  {
    type: "number",
    label: "ตัวเลขและค่าที่วัด (Number)",
    shortLabel: "ตัวเลข / ค่าที่วัด",
    category: "input",
    icon: "🔢",
    description: "ค่าอุณหภูมิ, ขนาด, ปริมาณ",
    defaultField: {
      type: "number",
      label: "ค่าที่วัดได้จริง (Measured Value)",
      placeholder: "0.00",
      width: "third",
      unit: "mm",
      required: true,
    },
  },
  {
    type: "date",
    label: "วันที่ตรวจ / ปฏิบัติ (Date)",
    shortLabel: "วันที่ตรวจ",
    category: "input",
    icon: "📅",
    description: "เลือกวันที่และเวลาปฏิบัติการ",
    defaultField: {
      type: "date",
      label: "วันที่ทำการตรวจสอบ (Inspection Date)",
      width: "half",
      required: true,
    },
  },
  {
    type: "select",
    label: "รายการตัวเลือก (Dropdown)",
    shortLabel: "ดรอปดาวน์",
    category: "selection",
    icon: "🔽",
    description: "เมนูดรอปดาวน์สำหรับเลือกหมวด",
    defaultField: {
      type: "select",
      label: "กะการทำงาน (Shift)",
      width: "half",
      options: ["กะเช้า (08:00 - 17:00)", "กะดึก (20:00 - 05:00)", "กะพิเศษ"],
      required: true,
    },
  },
  {
    type: "radio",
    label: "ตัวเลือกเดียว (Radio)",
    shortLabel: "ตัวเลือกเดียว (OK/NG)",
    category: "selection",
    icon: "🔘",
    description: "ผลการประเมิน เช่น ผ่าน / ไม่ผ่าน",
    defaultField: {
      type: "radio",
      label: "ผลการประเมินคุณภาพ (Quality Judgement)",
      width: "half",
      options: ["ผ่านเกณฑ์ (Pass / OK)", "ไม่ผ่านเกณฑ์ (Reject / NG)", "รอตัดสินใจ (Pending)"],
      required: true,
    },
  },
  {
    type: "checkbox",
    label: "กล่องติ๊กถูก (Checkbox)",
    shortLabel: "กล่องติ๊กถูก",
    category: "selection",
    icon: "☑️",
    description: "รายการเช็คความพร้อมก่อนเริ่มงาน",
    defaultField: {
      type: "checkbox",
      label: "ตรวจสอบสภาพความปลอดภัยและ 5ส เรียบร้อยก่อนเริ่มงาน",
      width: "full",
      required: false,
    },
  },
  {
    type: "section",
    label: "หัวข้อแบ่งส่วน (Section Header)",
    shortLabel: "หัวข้อแบ่งส่วน",
    category: "layout",
    icon: "📑",
    description: "แถบหัวข้อแบ่งหมวดหมู่ในเอกสาร",
    defaultField: {
      type: "section",
      label: "ส่วนที่ 1: ข้อมูลทั่วไปและการตรวจสอบ",
      width: "full",
    },
  },
  {
    type: "table",
    label: "ตารางรายการ (Data Table)",
    shortLabel: "ตารางข้อมูล",
    category: "layout",
    icon: "📊",
    description: "ตารางสุ่มตรวจชิ้นงานหรือพารามิเตอร์",
    defaultField: {
      type: "table",
      label: "บันทึกผลการสุ่มตรวจสอบชิ้นงาน (Sampling Inspection Data)",
      width: "full",
      columns: ["ลำดับที่", "จุดตรวจ / รายการ", "เกณฑ์มาตรฐาน", "ค่าที่วัดได้", "ผลการตัดสิน (OK/NG)"],
      required: false,
    },
  },
  {
    type: "note",
    label: "กล่องคำแนะนำ / คำเตือน (Note)",
    shortLabel: "กล่องคำแนะนำ",
    category: "layout",
    icon: "💡",
    description: "ข้อความแจ้งเตือนตามมาตรฐาน ISO",
    defaultField: {
      type: "note",
      label: "ข้อควรระวัง: หากพบค่าที่วัดได้เกินเกณฑ์มาตรฐาน ต้องหยุดกระบวนการและแจ้ง Quality Engineer ทันที",
      width: "full",
    },
  },
];

export function getSampleTemplate(documentId: string, documentCode: string, title: string): FormTemplate {
  return {
    id: `tpl-${documentId || "default"}`,
    documentId: documentId || "sample-doc",
    documentCode: documentCode || "FM-QC-001",
    title: `แบบฟอร์มบันทึก: ${title || "การตรวจรับและประเมินคุณภาพ"}`.trim(),
    description: "แบบฟอร์มบันทึกคุณภาพตามข้อกำหนด ISO 9001:2015 ข้อ 7.5.3 การควบคุมข้อมูลเอกสาร",
    formNumber: "FM-QC-001-A",
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: "System Admin",
    fields: [
      {
        id: "f-sec-1",
        type: "section",
        label: "1. ข้อมูลทั่วไปของงาน (General Information)",
        width: "full",
      },
      {
        id: "f-date-1",
        type: "date",
        label: "วันที่ตรวจประเมิน (Date)",
        width: "half",
        required: true,
      },
      {
        id: "f-shift-1",
        type: "select",
        label: "กะการทำงาน (Shift)",
        width: "half",
        options: ["กะเช้า (Day Shift)", "กะดึก (Night Shift)"],
        required: true,
      },
      {
        id: "f-lot-1",
        type: "text",
        label: "หมายเลข Lot / Batch No.",
        placeholder: "เช่น LOT-20261117-A1",
        width: "half",
        required: true,
      },
      {
        id: "f-sample-qty",
        type: "number",
        label: "จำนวนที่สุ่มตรวจ (Sample Size)",
        placeholder: "0",
        unit: "ชิ้น (pcs)",
        width: "half",
        required: true,
      },
      {
        id: "f-sec-2",
        type: "section",
        label: "2. ผลการตรวจวัดพารามิเตอร์คุณภาพ (Quality Inspection Results)",
        width: "full",
      },
      {
        id: "f-table-1",
        type: "table",
        label: "ตารางบันทึกการวัดขนาดและคุณลักษณะ (Dimension & Characteristics Table)",
        width: "full",
        columns: ["ชิ้นที่", "ความกว้าง (mm)", "ความยาว (mm)", "ความหนา (mm)", "ผลประเมิน"],
        required: false,
      },
      {
        id: "f-judgement",
        type: "radio",
        label: "ผลการตัดสินขั้นสุดท้าย (Final Judgement)",
        width: "half",
        options: ["ผ่านเกณฑ์ (Pass / Accepted)", "ไม่ผ่านเกณฑ์ (Reject / Hold)", "ส่งให้วิศวกรพิจารณา (Under Review)"],
        required: true,
      },
      {
        id: "f-remark",
        type: "textarea",
        label: "หมายเหตุและข้อสังเกตเพิ่มเติม (Remarks / Notes)",
        placeholder: "ระบุข้อสังเกตสภาพภายนอก หรือปัญหาที่พบ...",
        width: "half",
        required: false,
      },
    ],
  };
}

export function loadFormTemplate(documentId: string, documentCode: string, title: string): FormTemplate {
  if (typeof window === "undefined") return getSampleTemplate(documentId, documentCode, title);
  try {
    const raw = localStorage.getItem(`${TEMPLATES_KEY}_${documentId}`);
    if (raw) {
      const parsed: FormTemplate = JSON.parse(raw);
      // Clean up legacy signature fields from body since they are now formally placed in Footer
      parsed.fields = (parsed.fields || []).filter(
        (f) => f.id !== "f-sec-3" && f.type !== "signature"
      );
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load form template:", e);
  }
  const sample = getSampleTemplate(documentId, documentCode, title);
  saveFormTemplate(sample);
  return sample;
}

export function saveFormTemplate(template: FormTemplate): void {
  if (typeof window === "undefined") return;
  try {
    template.updatedAt = new Date().toISOString();
    localStorage.setItem(`${TEMPLATES_KEY}_${template.documentId}`, JSON.stringify(template));
  } catch (e) {
    console.error("Failed to save form template:", e);
  }
}

export function loadSubmissions(documentId: string): FormSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${SUBMISSIONS_KEY}_${documentId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load submissions:", e);
  }
  return [];
}

export function saveSubmission(submission: FormSubmission): void {
  if (typeof window === "undefined") return;
  try {
    const list = loadSubmissions(submission.documentId);
    const existingIndex = list.findIndex((s) => s.id === submission.id);
    if (existingIndex >= 0) {
      list[existingIndex] = submission;
    } else {
      list.unshift(submission);
    }
    localStorage.setItem(`${SUBMISSIONS_KEY}_${submission.documentId}`, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save submission:", e);
  }
}
