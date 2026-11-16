import type { IsoStandard } from "@/lib/types";

/** Seed data — copied into the Demo store (.data/db.json) on first run. */
export const seedStandards: IsoStandard[] = [
  {
    id: "iso9001",
    code: "ISO 9001",
    version: "2015",
    name: "ระบบการบริหารงานคุณภาพ (Quality Management Systems)",
    description: "ข้อกำหนดระบบบริหารงานคุณภาพ เพื่อให้ผลิตภัณฑ์และบริการเป็นไปตามความต้องการของลูกค้า",
  },
  {
    id: "iso14001",
    code: "ISO 14001",
    version: "2015",
    name: "ระบบการจัดการสิ่งแวดล้อม (Environmental Management Systems)",
    description: "ข้อกำหนดระบบการจัดการสิ่งแวดล้อม เพื่อควบคุมและลดผลกระทบต่อสิ่งแวดล้อม",
  },
];
