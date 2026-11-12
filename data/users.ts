import type { User } from "@/lib/types";

export const users: User[] = [
  { id: "u1", name: "สมชาย ใจดี", nameEn: "Somchai Jaidee", role: "qe", position: "QE / QMR (ปรับกฎ)", department: "Quality", departmentId: "quality" },
  { id: "u2", name: "สุดา แก้วงาม", nameEn: "Suda Kaewngam", role: "iso", position: "ISO Auditor (ออกตรวจ)", department: "Quality", departmentId: "quality" },
  { id: "u3", name: "วิชัย ทองดี", nameEn: "Wichai Thongdee", role: "employee", position: "Department Head", department: "Production", departmentId: "production" },
  { id: "u4", name: "ผู้ดูแลระบบ (Demo)", nameEn: "System Admin (Demo)", role: "admin", position: "System Administrator", department: "Quality", departmentId: "quality" },
];
