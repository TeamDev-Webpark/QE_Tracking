"use client";

import { useState } from "react";
import { Button, useToast } from "@/components/ui";
import { useSessionUser } from "@/components/providers/SessionProvider";
import {
  loadFormTemplate,
  loadSubmissions,
  saveSubmission,
} from "./designerStorage";
import { generateFormSubmissionPdf } from "./generateFormPdf";
import type { FormField, FormSubmission, FormTemplate } from "./types";

export function DocumentFormFiller({
  documentId,
  documentCode,
  documentTitle,
  onClose,
  onOpenDesigner,
  canDesign = false,
}: {
  documentId: string;
  documentCode: string;
  documentTitle: string;
  onClose: () => void;
  onOpenDesigner?: () => void;
  canDesign?: boolean;
}) {
  const toast = useToast();
  const sessionUser = useSessionUser();
  const template: FormTemplate = loadFormTemplate(documentId, documentCode, documentTitle);
  const existingSubmissions = loadSubmissions(documentId);

  const [activeSubmissionId, setActiveSubmissionId] = useState<string>("new");
  const [isExporting, setIsExporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Initial values for a new submission
  const createNewSubmission = (): FormSubmission => ({
    id: `sub-${Date.now()}`,
    templateId: template.id,
    documentId: template.documentId,
    documentCode: template.documentCode,
    title: template.title,
    values: {
      "f-date-1": new Date().toISOString().split("T")[0],
      footer_sign_prepared: sessionUser.name,
    },
    status: "draft",
    filledBy: {
      id: sessionUser.id || "guest",
      name: sessionUser.name || "พนักงาน",
      department: sessionUser.department || "ฝ่ายผลิต",
    },
    filledAt: new Date().toISOString(),
  });

  const [currentSubmission, setCurrentSubmission] = useState<FormSubmission>(() => {
    if (existingSubmissions.length > 0) {
      return existingSubmissions[0];
    }
    return createNewSubmission();
  });

  // Switch between submissions or create new
  const handleSelectSubmission = (id: string) => {
    setActiveSubmissionId(id);
    if (id === "new") {
      setCurrentSubmission(createNewSubmission());
    } else {
      const found = existingSubmissions.find((s) => s.id === id);
      if (found) setCurrentSubmission(found);
    }
  };

  // Update a field value
  const handleValueChange = (fieldId: string, val: any) => {
    setCurrentSubmission((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [fieldId]: val,
      },
    }));
  };

  // Add row to table field
  const handleAddTableRow = (field: FormField) => {
    const cur = currentSubmission.values[field.id] || [];
    const cols = field.columns || ["col_0", "col_1"];
    const emptyRow: Record<string, string> = {};
    cols.forEach((_, cIdx) => {
      emptyRow[`col_${cIdx}`] = cIdx === 0 ? String(cur.length + 1) : "";
    });
    handleValueChange(field.id, [...cur, emptyRow]);
  };

  // Save submission (draft or submit)
  const handleSave = (status: "draft" | "submitted") => {
    const toSave: FormSubmission = {
      ...currentSubmission,
      status,
      filledAt: new Date().toISOString(),
      filledBy: {
        id: sessionUser.id || "guest",
        name: sessionUser.name || "พนักงาน",
        department: sessionUser.department || "-",
      },
    };

    saveSubmission(toSave);
    setCurrentSubmission(toSave);
    setActiveSubmissionId(toSave.id);
    toast.success(
      status === "submitted"
        ? "ส่งบันทึกคุณภาพเรียบร้อยแล้ว (Submitted)"
        : "บันทึกฉบับร่างเรียบร้อย (Draft Saved)"
    );
  };

  // Download PDF
  const handleDownloadPdf = async (isControlled: boolean) => {
    setIsExporting(true);
    try {
      await generateFormSubmissionPdf({
        template,
        submission: currentSubmission,
        orgName: "บริษัท ควอลิตี้ แมนูแฟคเจอริ่ง จำกัด",
        isControlled,
      });
      toast.success(
        isControlled
          ? "ดาวน์โหลดแบบฟอร์ม (Controlled Copy) สำเร็จ"
          : "ดาวน์โหลดแบบฟอร์ม (Uncontrolled Copy) สำเร็จ"
      );
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/30 backdrop-blur-xs transition-all">
      {/* Top Application Bar (Clean White & Sky Blue) */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-sky-100 bg-white/98 backdrop-blur-md px-3 sm:px-5 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-sky-50 hover:text-sky-700 transition"
          >
            ← <span className="hidden sm:inline">ปิด</span>
          </button>
          <div className="h-4 w-px bg-sky-100 hidden sm:block" />
          <div className="min-w-0 flex items-center gap-2">
            <span className="shrink-0 rounded-md bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-bold text-sky-700">
              {template.documentCode}
            </span>
            <h1 className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">{template.title}</h1>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.2 text-[10px] font-bold ${
                currentSubmission.status === "submitted"
                  ? "bg-sky-100 text-sky-800 border border-sky-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {currentSubmission.status === "submitted" ? "บันทึกเสร็จสิ้น" : "ฉบับร่าง"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle History on mobile */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="md:hidden rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700"
          >
            📋 ประวัติ
          </button>

          {canDesign && onOpenDesigner && (
            <button
              onClick={onOpenDesigner}
              className="hidden lg:flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 transition"
            >
              🎨 ตัวออกแบบ (Designer)
            </button>
          )}

          <button
            onClick={() => handleSave("draft")}
            className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-sky-50 transition"
          >
            💾 <span className="hidden sm:inline">บันทึกร่าง</span>
          </button>

          <Button size="sm" onClick={() => handleSave("submitted")} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-3.5 shadow-sm shadow-sky-200">
            ✅ <span className="hidden sm:inline">ยืนยันบันทึก</span>
          </Button>

          {/* Download Controlled PDF */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDownloadPdf(true)}
            disabled={isExporting}
            className="font-semibold text-xs border-sky-200 text-sky-700 bg-sky-50/70 hover:bg-sky-100 px-3 transition"
          >
            {isExporting ? "กำลังสร้าง PDF..." : "📄 ดาวน์โหลด PDF"}
          </Button>
        </div>
      </header>

      {/* Main Filler Layout (Clean White & Sky Theme) */}
      <div className="flex flex-1 overflow-hidden bg-[#f4f8fb] relative">
        
        {/* LEFT: Submission History Sidebar (White & Sky Border) */}
        <aside
          className={`w-64 shrink-0 border-r border-sky-100 bg-white flex flex-col z-20 ${
            showHistory
              ? "absolute inset-y-0 left-0 shadow-2xl"
              : "hidden md:flex"
          }`}
        >
          <div className="p-3 border-b border-sky-100 flex items-center justify-between bg-sky-50/40">
            <span className="text-xs font-bold text-sky-900">ประวัติการบันทึกข้อมูล</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSelectSubmission("new")}
                className="rounded-md bg-sky-600 text-white px-2 py-0.5 text-[11px] font-bold hover:bg-sky-700 shadow-2xs transition"
              >
                + กรอกใบใหม่
              </button>
              {showHistory && (
                <button
                  onClick={() => setShowHistory(false)}
                  className="md:hidden text-slate-400 text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-white">
            {existingSubmissions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">ยังไม่มีประวัติการบันทึก</div>
            ) : (
              existingSubmissions.map((sub) => {
                const isSelected = currentSubmission.id === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      handleSelectSubmission(sub.id);
                      setShowHistory(false);
                    }}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/70 shadow-xs"
                        : "border-sky-100 hover:bg-sky-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="truncate">{sub.values["f-lot-1"] || "บันทึกไม่มี Lot"}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full shrink-0 ml-1 font-semibold ${
                          sub.status === "submitted"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {sub.status === "submitted" ? "เสร็จ" : "ร่าง"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                      <span className="truncate">{sub.filledBy.name}</span>
                      <span className="shrink-0">{new Date(sub.filledAt).toLocaleDateString("th-TH")}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* CENTER: Fillable Form Paper (Pure White Canvas) */}
        <main className="flex-1 overflow-x-auto overflow-y-auto p-3 sm:p-6 md:p-8 flex justify-center items-start">
          <div className="w-full max-w-[850px] bg-white text-slate-800 shadow-xl shadow-sky-100/60 rounded-xl border border-sky-100/90 p-5 sm:p-7 md:p-9 flex flex-col justify-start my-2">
            {/* ========================================================
                PART 1: HEADER (ส่วนหัวเอกสาร - 🔒 ล็อค ปรับไม่ได้)
               ======================================================== */}
            <div className="mb-5 select-none">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-sky-800">
                  <span className="text-sky-600 text-xs">🔒</span>
                  <span>ส่วนหัวเอกสาร (Header)</span>
                  <span className="text-[10px] text-slate-400 font-normal">• อ้างอิงตาม ISO 9001: 7.5.3</span>
                </span>
                <span className="rounded-full bg-sky-50 border border-sky-150 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  Read-only
                </span>
              </div>

              {/* White & Sky Clean Header Card */}
              <div className="rounded-lg border border-sky-200/90 bg-white shadow-2xs overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-12 sm:divide-x divide-y sm:divide-y-0 divide-sky-100">
                  <div className="sm:col-span-3 p-3 text-center flex flex-col justify-center items-center bg-sky-50/30">
                    <div className="h-8 w-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-xs shadow-xs mb-1">
                      QE
                    </div>
                    <span className="text-xs font-bold text-sky-950 tracking-wider">QE TRACKING</span>
                    <span className="text-[9px] text-sky-600 font-semibold">Quality Management</span>
                  </div>
                  <div className="sm:col-span-6 p-3 text-center flex flex-col justify-center bg-white">
                    <span className="text-[11px] text-slate-400 font-medium">บริษัท ควอลิตี้ แมนูแฟคเจอริ่ง จำกัด</span>
                    <h2 className="text-sm font-bold text-slate-900 mt-0.5">{template.title}</h2>
                    <span className="text-[10px] text-sky-600 font-semibold mt-0.5">แบบฟอร์มบันทึกคุณภาพตาม ISO 9001:2015</span>
                  </div>
                  <div className="sm:col-span-3 p-2.5 sm:p-3 text-[10px] leading-relaxed text-slate-600 flex flex-col justify-center bg-sky-50/30">
                    <div className="flex justify-between sm:block">
                      <span className="text-slate-400">รหัส: </span>
                      <strong className="text-sky-900">{template.documentCode}</strong>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-slate-400">ฉบับที่ (Rev): </span>
                      <strong className="text-sky-900">{String(template.revision).padStart(2, "0")}</strong>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-slate-400">วันที่: </span>
                      <span className="text-slate-700">{new Date().toLocaleDateString("th-TH")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controlled Banner */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 rounded-md border border-sky-200/90 bg-sky-50/50 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-sky-600 px-1.5 py-0.2 text-[9px] font-black text-white tracking-wider">
                    CONTROLLED
                  </span>
                  <span className="text-[10px] font-semibold text-sky-900">
                    เอกสารควบคุม — ข้อมูลที่บันทึกถือเป็นบันทึกคุณภาพอย่างเป็นทางการ (Quality Record)
                  </span>
                </div>
                <span className="text-[10px] text-sky-600">ISO 9001: 7.5.3</span>
              </div>
            </div>

            {/* ========================================================
                PART 2: BODY (ส่วนเนื้อหาแบบฟอร์ม - ✏️ พนักงานกรอกและแก้ไขได้)
               ======================================================== */}
            <div className="my-2">
              <div className="mb-3 flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-1.5 text-[11px] font-semibold text-sky-900">
                <span className="flex items-center gap-1.5">
                  <span className="text-sky-600">✏️</span>
                  <span>ส่วนเนื้อหาฟอร์ม (Body) — กรอกข้อมูลการปฏิบัติงาน</span>
                </span>
                <span className="rounded-full bg-white border border-sky-200 px-2.5 py-0.2 text-[10px] font-bold text-sky-700 shadow-2xs">
                  สถานะ: {currentSubmission.status === "submitted" ? "บันทึกเสร็จสิ้น" : "ฉบับร่าง"}
                </span>
              </div>

              <div className="flex flex-wrap -mx-1.5 sm:-mx-2">
                {template.fields.map((field) => {
                  const widthClass =
                    field.width === "half"
                      ? "w-full md:w-1/2 px-1.5 sm:px-2 mb-3.5"
                      : field.width === "third"
                      ? "w-full md:w-1/3 px-1.5 sm:px-2 mb-3.5"
                      : "w-full px-1.5 sm:px-2 mb-3.5";

                  const val = currentSubmission.values[field.id];

                  if (field.type === "section") {
                    return (
                      <div key={field.id} className="w-full px-1.5 sm:px-2 mb-2.5 mt-2">
                        <div className="border-b-2 border-sky-500 pb-1.5">
                          <span className="text-xs font-bold text-sky-900 tracking-wide uppercase flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-sky-600 inline-block" />
                            {field.label}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (field.type === "note") {
                    return (
                      <div key={field.id} className="w-full px-1.5 sm:px-2 mb-3">
                        <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-2.5 text-xs text-sky-950 leading-relaxed">
                          💡 {field.label}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={field.id} className={widthClass}>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        {field.unit && <span className="text-[10px] text-sky-700 font-medium ml-1">({field.unit})</span>}
                      </label>

                      {/* Text Input */}
                      {field.type === "text" && (
                        <input
                          type="text"
                          value={val || ""}
                          onChange={(e) => handleValueChange(field.id, e.target.value)}
                          placeholder={field.placeholder || "กรอกข้อความ..."}
                          className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-hidden transition"
                        />
                      )}

                      {/* Number Input */}
                      {field.type === "number" && (
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            value={val || ""}
                            onChange={(e) => handleValueChange(field.id, e.target.value)}
                            placeholder={field.placeholder || "0"}
                            className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-hidden pr-12 transition"
                          />
                          {field.unit && (
                            <span className="absolute right-3 top-1.5 text-[11px] text-sky-600 pointer-events-none font-semibold">
                              {field.unit}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Textarea */}
                      {field.type === "textarea" && (
                        <textarea
                          rows={3}
                          value={val || ""}
                          onChange={(e) => handleValueChange(field.id, e.target.value)}
                          placeholder={field.placeholder || "กรอกรายละเอียด..."}
                          className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-hidden resize-y transition"
                        />
                      )}

                      {/* Date */}
                      {field.type === "date" && (
                        <input
                          type="date"
                          value={val || ""}
                          onChange={(e) => handleValueChange(field.id, e.target.value)}
                          className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-hidden transition"
                        />
                      )}

                      {/* Select */}
                      {field.type === "select" && (
                        <select
                          value={val || ""}
                          onChange={(e) => handleValueChange(field.id, e.target.value)}
                          className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-hidden transition"
                        >
                          <option value="">-- กรุณาเลือก --</option>
                          {(field.options || []).map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Radio */}
                      {field.type === "radio" && (
                        <div className="flex flex-wrap gap-4 pt-1">
                          {(field.options || []).map((opt, i) => (
                            <label key={i} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name={field.id}
                                value={opt}
                                checked={val === opt}
                                onChange={(e) => handleValueChange(field.id, e.target.value)}
                                className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Checkbox */}
                      {field.type === "checkbox" && (
                        <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => handleValueChange(field.id, e.target.checked)}
                            className="h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                          />
                          <span>{field.placeholder || "ยืนยันผลการตรวจสอบ"}</span>
                        </label>
                      )}

                      {/* Table Input (White & Sky Border) */}
                      {field.type === "table" && (
                        <div className="rounded-lg border border-sky-200 overflow-hidden shadow-2xs">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[420px] border-collapse text-[11px]">
                              <thead>
                                <tr className="bg-sky-50/70 text-sky-900">
                                  {(field.columns || ["ลำดับ", "รายการ", "ผล"]).map((c, i) => (
                                    <th key={i} className="border-b border-r border-sky-100 px-3 py-1.5 text-left font-bold">
                                      {c}
                                    </th>
                                  ))}
                                  <th className="border-b border-sky-100 px-2 py-1.5 w-10 text-center text-sky-800">ลบ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {((val as any[]) || []).length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={(field.columns?.length || 3) + 1}
                                      className="p-3 text-center text-slate-400 text-xs"
                                    >
                                      ยังไม่มีรายการ กดปุ่ม "+ เพิ่มแถว" ด้านล่างเพื่อบันทึกข้อมูล
                                    </td>
                                  </tr>
                                ) : (
                                  (val as any[]).map((row, rIdx) => (
                                    <tr key={rIdx} className="border-b border-sky-50 hover:bg-sky-50/30 transition">
                                      {(field.columns || []).map((_, cIdx) => (
                                        <td key={cIdx} className="border-r border-sky-50 p-1">
                                          <input
                                            type="text"
                                            value={row[`col_${cIdx}`] || ""}
                                            onChange={(e) => {
                                              const newRows = [...val];
                                              newRows[rIdx] = {
                                                ...newRows[rIdx],
                                                [`col_${cIdx}`]: e.target.value,
                                              };
                                              handleValueChange(field.id, newRows);
                                            }}
                                            className="w-full rounded border border-sky-150 px-2.5 py-1 text-xs focus:border-sky-500 focus:outline-hidden"
                                          />
                                        </td>
                                      ))}
                                      <td className="p-1 text-center">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newRows = val.filter((_: any, i: number) => i !== rIdx);
                                            handleValueChange(field.id, newRows);
                                          }}
                                          className="text-slate-400 hover:text-red-500 text-xs px-1"
                                        >
                                          ✕
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-sky-50/40 p-2 border-t border-sky-100">
                            <button
                              type="button"
                              onClick={() => handleAddTableRow(field)}
                              className="text-xs font-semibold text-sky-600 hover:text-sky-800 px-2 py-0.5 transition"
                            >
                              + เพิ่มแถวใหม่
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================
                PART 3: FOOTER (ส่วนท้ายเอกสาร - 🔒 ล็อค ปรับไม่ได้)
               ======================================================== */}
            <div className="w-full relative mt-5 pt-3 border-t border-sky-100 select-none bg-sky-50/30 p-3.5 sm:p-4 rounded-xl">
              <div className="mb-2.5 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-sky-800">
                  <span className="text-sky-600 text-xs">🔒</span>
                  <span>ส่วนท้ายเอกสาร (Footer) — ช่องลงนามรับรองคุณภาพ</span>
                </span>
                <span className="rounded-full bg-white border border-sky-150 px-2 py-0.5 text-[10px] font-semibold text-sky-700 shadow-2xs">
                  ISO Standard Footer
                </span>
              </div>

              {/* Clean White & Sky Signature Cards in Footer */}
              <div className="mb-3 rounded-lg border border-sky-200/90 bg-white overflow-hidden shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-sky-100">
                  {/* Sign 1: Prepared / Inspector */}
                  <div className="p-3 text-center flex flex-col justify-between min-h-[125px]">
                    <div className="text-[11px] font-semibold text-slate-800 pb-1 border-b border-sky-50 flex items-center justify-between">
                      <span>ผู้ตรวจสอบและจัดทำ (Prepared)</span>
                      <button
                        type="button"
                        onClick={() => handleValueChange("footer_sign_prepared", sessionUser.name)}
                        className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer bg-sky-50 px-1.5 py-0.2 rounded"
                        title="ดึงชื่อฉันเพื่อลงนาม"
                      >
                        ✍️ เซ็นชื่อฉัน
                      </button>
                    </div>
                    <div className="my-2 border border-dashed border-sky-200 rounded-md px-2 py-1.5 bg-sky-50/30">
                      <input
                        type="text"
                        value={currentSubmission.values["footer_sign_prepared"] ?? currentSubmission.filledBy.name}
                        onChange={(e) => handleValueChange("footer_sign_prepared", e.target.value)}
                        placeholder="พิมพ์ชื่อผู้จัดทำ..."
                        className="w-full text-center font-bold text-xs text-sky-800 bg-transparent border-b border-sky-200 focus:border-sky-500 focus:outline-hidden pb-0.5"
                      />
                      <div className="text-[9px] text-slate-400 mt-1">ผู้จัดทำบันทึก</div>
                    </div>
                    <div className="text-[9px] text-slate-400 flex justify-between px-1">
                      <span>แผนก: {currentSubmission.filledBy.department || "ฝ่ายผลิต"}</span>
                      <span>วันที่: {new Date(currentSubmission.filledAt).toLocaleDateString("th-TH")}</span>
                    </div>
                  </div>

                  {/* Sign 2: Reviewed / Supervisor */}
                  <div className="p-3 text-center flex flex-col justify-between min-h-[125px]">
                    <div className="text-[11px] font-semibold text-slate-800 pb-1 border-b border-sky-50 flex items-center justify-between">
                      <span>ผู้ทบทวน (Reviewed By)</span>
                      <button
                        type="button"
                        onClick={() => handleValueChange("footer_sign_reviewed", sessionUser.name)}
                        className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer bg-sky-50 px-1.5 py-0.2 rounded"
                        title="ดึงชื่อฉันเพื่อลงนาม"
                      >
                        ✍️ เซ็นชื่อฉัน
                      </button>
                    </div>
                    <div className="my-2 border border-dashed border-sky-200 rounded-md px-2 py-1.5 bg-sky-50/30">
                      <input
                        type="text"
                        value={currentSubmission.values["footer_sign_reviewed"] || ""}
                        onChange={(e) => handleValueChange("footer_sign_reviewed", e.target.value)}
                        placeholder="พิมพ์ชื่อผู้ทบทวน..."
                        className="w-full text-center font-bold text-xs text-sky-800 bg-transparent border-b border-sky-200 focus:border-sky-500 focus:outline-hidden pb-0.5"
                      />
                      <div className="text-[9px] text-slate-400 mt-1">หัวหน้างาน / Supervisor</div>
                    </div>
                    <div className="text-[9px] text-slate-400 flex justify-between px-1">
                      <span>หัวหน้างาน</span>
                      <span>{new Date().toLocaleDateString("th-TH")}</span>
                    </div>
                  </div>

                  {/* Sign 3: Approved / QMR */}
                  <div className="p-3 text-center flex flex-col justify-between min-h-[125px]">
                    <div className="text-[11px] font-semibold text-slate-800 pb-1 border-b border-sky-50 flex items-center justify-between">
                      <span>ผู้อนุมัติ (Approved By)</span>
                      <button
                        type="button"
                        onClick={() => handleValueChange("footer_sign_approved", sessionUser.name)}
                        className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer bg-sky-50 px-1.5 py-0.2 rounded"
                        title="ดึงชื่อฉันเพื่อลงนาม"
                      >
                        ✍️ เซ็นชื่อฉัน
                      </button>
                    </div>
                    <div className="my-2 border border-dashed border-sky-200 rounded-md px-2 py-1.5 bg-sky-50/30">
                      <input
                        type="text"
                        value={currentSubmission.values["footer_sign_approved"] || ""}
                        onChange={(e) => handleValueChange("footer_sign_approved", e.target.value)}
                        placeholder="พิมพ์ชื่อผู้อนุมัติ..."
                        className="w-full text-center font-bold text-xs text-sky-800 bg-transparent border-b border-sky-200 focus:border-sky-500 focus:outline-hidden pb-0.5"
                      />
                      <div className="text-[9px] text-slate-400 mt-1">ผู้จัดการฝ่าย / QMR</div>
                    </div>
                    <div className="text-[9px] text-slate-400 flex justify-between px-1">
                      <span>QMR / ผจก.</span>
                      <span>{new Date().toLocaleDateString("th-TH")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ISO Ownership Notice & Page Details */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1">
                <p>
                  บันทึกคุณภาพตามข้อกำหนด ISO 9001:2015 ข้อ 7.5.3 การควบคุมข้อมูลเอกสาร
                </p>
                <div className="text-right text-sky-700 font-medium">
                  <span>รหัส: {template.documentCode} | หน้า 1 จาก 1</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
