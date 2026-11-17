"use client";

import { useState } from "react";
import { Button, useToast } from "@/components/ui";
import { useSessionUser } from "@/components/providers/SessionProvider";
import {
  DEFAULT_PALETTE_ITEMS,
  loadFormTemplate,
  saveFormTemplate,
} from "./designerStorage";
import type { FormField, FormTemplate } from "./types";

export function DocumentFormDesigner({
  documentId,
  documentCode,
  documentTitle,
  onClose,
  onOpenFiller,
}: {
  documentId: string;
  documentCode: string;
  documentTitle: string;
  onClose: () => void;
  onOpenFiller?: () => void;
}) {
  const toast = useToast();
  const sessionUser = useSessionUser();
  const [template, setTemplate] = useState<FormTemplate>(() =>
    loadFormTemplate(documentId, documentCode, documentTitle)
  );

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    template.fields[0]?.id || null
  );
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isDraggingOverWorkspace, setIsDraggingOverWorkspace] = useState(false);
  const [activeTab, setActiveTab] = useState<"toolbox" | "properties">("toolbox");
  const [previewMode, setPreviewMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const selectedField = template.fields.find((f) => f.id === selectedFieldId);

  // Add field from toolbox
  const handleAddField = (itemType: FormField["type"]) => {
    const paletteDef = DEFAULT_PALETTE_ITEMS.find((p) => p.type === itemType);
    if (!paletteDef) return;

    const newField: FormField = {
      ...paletteDef.defaultField,
      id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    setTemplate((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newField.id);
    setActiveTab("properties");
    setShowSidebar(true);
    toast.success(`เพิ่ม "${paletteDef.label.split("(")[0]}" แล้ว`);
  };

  // Reorder fields via Drag & Drop
  const handleDragStartField = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOverField = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

    const newFields = [...template.fields];
    const [dragged] = newFields.splice(draggedItemIndex, 1);
    newFields.splice(targetIndex, 0, dragged);
    setTemplate((prev) => ({ ...prev, fields: newFields }));
    setDraggedItemIndex(targetIndex);
  };

  const handleDropField = () => {
    setDraggedItemIndex(null);
  };

  // Handle external drop from toolbox
  const handleDropFromToolbox = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverWorkspace(false);
    const itemType = e.dataTransfer.getData("application/x-field-type") as FormField["type"];
    if (itemType) {
      handleAddField(itemType);
    }
  };

  // Update field properties
  const updateSelectedField = (updater: (f: FormField) => FormField) => {
    if (!selectedFieldId) return;
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === selectedFieldId ? updater(f) : f)),
    }));
  };

  // Delete field
  const handleDeleteField = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }));
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
      setActiveTab("toolbox");
    }
    toast.success("ลบช่องข้อมูลเรียบร้อย");
  };

  // Duplicate field
  const handleDuplicateField = (field: FormField, e: React.MouseEvent) => {
    e.stopPropagation();
    const dup: FormField = {
      ...field,
      id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: `${field.label} (สำเนา)`,
    };
    const idx = template.fields.findIndex((f) => f.id === field.id);
    const newFields = [...template.fields];
    newFields.splice(idx + 1, 0, dup);
    setTemplate((prev) => ({ ...prev, fields: newFields }));
    setSelectedFieldId(dup.id);
    toast.success("คัดลอกช่องข้อมูลแล้ว");
  };

  // Save template
  const handleSave = () => {
    template.updatedBy = sessionUser.name || "Admin";
    saveFormTemplate(template);
    toast.success("บันทึกแบบฟอร์มเรียบร้อยแล้ว");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/30 backdrop-blur-xs transition-all">
      {/* Top Application Bar (Clean White & Sky Blue Border) */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-sky-100 bg-white/98 backdrop-blur-md px-3 sm:px-5 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-sky-50 hover:text-sky-700 transition"
            title="กลับสู่หน้ารายละเอียดเอกสาร"
          >
            ← <span className="hidden sm:inline">ปิดตัวออกแบบ</span>
          </button>
          <div className="h-4 w-px bg-sky-100 hidden sm:block" />
          <div className="min-w-0 flex items-center gap-2">
            <span className="shrink-0 rounded-md bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-xs font-bold text-sky-700">
              {template.documentCode}
            </span>
            <h1 className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">{template.title}</h1>
            <span className="hidden md:inline-flex rounded-full bg-sky-50 border border-sky-100 px-2 py-0.2 text-[10px] text-sky-700 font-semibold">
              Rev.{template.revision}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="hidden md:flex items-center rounded-lg border border-sky-150 bg-sky-50/50 p-0.5 text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
              className="px-2 py-1 text-sky-700 hover:bg-white rounded transition font-bold"
              title="ย่อขนาด"
            >
              -
            </button>
            <span className="px-2 font-mono text-[11px] text-sky-900 font-bold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(125, z + 10))}
              className="px-2 py-1 text-sky-700 hover:bg-white rounded transition font-bold"
              title="ขยายขนาด"
            >
              +
            </button>
          </div>

          {/* Switch Preview / Edit */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              previewMode
                ? "bg-sky-600 text-white shadow-xs"
                : "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
            }`}
          >
            <span>{previewMode ? "✏️" : "👁️"}</span>
            <span className="hidden sm:inline">{previewMode ? "โหมดแก้ไข" : "พรีวิว"}</span>
          </button>

          {onOpenFiller && (
            <button
              onClick={onOpenFiller}
              className="hidden lg:flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition"
            >
              📝 กรอกแบบฟอร์ม
            </button>
          )}

          <Button size="sm" onClick={handleSave} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-3.5 shadow-sm shadow-sky-200">
            💾 <span className="hidden sm:inline">บันทึกฟอร์ม</span>
          </Button>

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              showSidebar
                ? "border-sky-300 bg-sky-50 text-sky-700"
                : "border-sky-200 bg-white text-slate-700 hover:bg-sky-50"
            }`}
            title={showSidebar ? "ซ่อนแถบเครื่องมือ" : "เปิดแถบเครื่องมือ"}
          >
            🧰 <span className="hidden xl:inline">{showSidebar ? "ซ่อนเครื่องมือ" : "เครื่องมือ"}</span>
          </button>
        </div>
      </header>

      {/* Main Designer Layout (Clean Sky Blue Tinted Canvas Background) */}
      <div className="flex flex-1 overflow-hidden bg-[#f4f8fb] relative">
        
        {/* CENTER: Workspace (Paper A4 Canvas with Grid) */}
        <main className="relative flex-1 overflow-x-auto overflow-y-auto p-3 sm:p-6 md:p-8 flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease",
            }}
            className="w-full max-w-[850px] my-2"
          >
            {/* Paper A4 Container (Pure White with Soft Sky Glow Shadow) */}
            <div
              className={`w-full bg-white text-slate-800 shadow-xl shadow-sky-100/60 rounded-xl border border-sky-100/90 p-5 sm:p-7 md:p-9 flex flex-col justify-start transition-all relative ${
                isDraggingOverWorkspace
                  ? "ring-4 ring-sky-300/60 border-sky-400"
                  : ""
              }`}
            >
              {/* ========================================================
                  PART 1: HEADER (ส่วนหัวเอกสาร - 🔒 ล็อคตามมาตรฐาน ISO)
                 ======================================================== */}
              <div className="relative mb-5 select-none">
                {/* Header Lock Pill Badge */}
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 font-semibold text-sky-800">
                    <span className="text-sky-600 text-xs">🔒</span>
                    <span>ส่วนหัวเอกสาร (Header)</span>
                    <span className="text-[10px] text-slate-400 font-normal">• ข้อกำหนด ISO 9001: 7.5.3</span>
                  </span>
                  <span className="rounded-full bg-sky-50 border border-sky-150 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                    Read-only (ล็อค)
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
                      <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                        {template.title}
                      </h2>
                      <span className="text-[10px] text-sky-600 font-semibold mt-0.5">
                        แบบฟอร์มบันทึกคุณภาพตามข้อกำหนด ISO 9001:2015
                      </span>
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
                        <span className="text-slate-400">มีผล: </span>
                        <span className="text-slate-700">01 ม.ค. 2569</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* White & Sky Clean Controlled Banner */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 rounded-md border border-sky-200/90 bg-sky-50/50 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-sky-600 px-1.5 py-0.2 text-[9px] font-black text-white tracking-wider">
                      CONTROLLED
                    </span>
                    <span className="text-[10px] font-semibold text-sky-900">
                      เอกสารควบคุม — ระบบควบคุมการเปลี่ยนแปลงตาม ISO 9001: 7.5.3
                    </span>
                  </div>
                  <span className="text-[10px] text-sky-600">ส่วนหัวล็อคอัตโนมัติ</span>
                </div>
              </div>

              {/* ========================================================
                  PART 2: BODY (ส่วนเนื้อหาแบบฟอร์ม - ✏️ ปรับแต่งได้เฉพาะส่วนนี้)
                 ======================================================== */}
              <div className="w-full my-2">
                {/* Body Zone Notice */}
                <div className="mb-2.5 flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-1.5 text-[11px] font-semibold text-sky-900">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sky-600">✏️</span>
                    <span>ส่วนเนื้อหาฟอร์ม (Body Workspace)</span>
                    <span className="text-[10px] text-sky-600 font-normal hidden sm:inline">• ลากวาง จัดเรียง และแก้ไขช่องข้อมูลได้ที่นี่</span>
                  </span>
                  <span className="rounded-full bg-white border border-sky-200 px-2.5 py-0.2 text-[10px] font-bold text-sky-700 shadow-2xs">
                    {template.fields.length} ช่องข้อมูล
                  </span>
                </div>

                {/* Droppable Body Canvas (White with Soft Sky Dashed Border) */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOverWorkspace(true);
                  }}
                  onDragLeave={() => setIsDraggingOverWorkspace(false)}
                  onDrop={handleDropFromToolbox}
                  className={`w-full min-h-[300px] rounded-xl border-2 border-dashed p-3 sm:p-4 transition-all bg-white ${
                    isDraggingOverWorkspace
                      ? "border-sky-500 bg-sky-50/40 ring-4 ring-sky-200/50"
                      : "border-sky-200/80 hover:border-sky-300"
                  }`}
                >
                  {template.fields.length === 0 ? (
                    <div className="my-12 flex flex-col items-center justify-center py-8 text-center">
                      <div className="h-12 w-12 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 text-xl mb-2 shadow-2xs">
                        📥
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">ส่วนเนื้อหา (Body) ยังไม่มีช่องกรอก</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        เลือก Input จากกล่องเครื่องมือด้านขวา หรือคลิกเพิ่มเพื่อเริ่มออกแบบฟอร์ม
                      </p>
                      <button
                        onClick={() => handleAddField("text")}
                        className="mt-4 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-sky-200 hover:bg-sky-700 transition"
                      >
                        + เพิ่ม Text Input แรก
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap -mx-1.5 sm:-mx-2">
                      {template.fields.map((field, index) => {
                        const isSelected = selectedFieldId === field.id && !previewMode;
                        const widthClass =
                          field.width === "half"
                            ? "w-full md:w-1/2 px-1.5 sm:px-2 mb-3"
                            : field.width === "third"
                            ? "w-full md:w-1/3 px-1.5 sm:px-2 mb-3"
                            : "w-full px-1.5 sm:px-2 mb-3";

                        return (
                          <div
                            key={field.id}
                            className={widthClass}
                            draggable={!previewMode}
                            onDragStart={() => handleDragStartField(index)}
                            onDragOver={(e) => handleDragOverField(e, index)}
                            onDrop={handleDropField}
                          >
                            <div
                              onClick={() => {
                                if (!previewMode) {
                                  setSelectedFieldId(field.id);
                                  setActiveTab("properties");
                                  setShowSidebar(true);
                                }
                              }}
                              className={`group relative rounded-lg p-3 transition-all cursor-pointer bg-white border ${
                                isSelected
                                  ? "border-sky-500 ring-2 ring-sky-200 shadow-sm"
                                  : "border-slate-200/90 hover:border-sky-300 hover:shadow-2xs"
                              } ${previewMode ? "cursor-default" : ""}`}
                            >
                              {/* Reorder drag handle & Quick Actions (visible on hover) */}
                              {!previewMode && (
                                <div className="absolute -top-2.5 right-2 hidden group-hover:flex items-center gap-1 bg-white border border-sky-200 rounded-md shadow-xs px-1.5 py-0.5 z-10">
                                  <span className="cursor-grab text-slate-400 hover:text-sky-600 px-1 text-xs" title="ลากเพื่อสลับตำแหน่ง">
                                    ⠿
                                  </span>
                                  <button
                                    onClick={(e) => handleDuplicateField(field, e)}
                                    className="text-slate-400 hover:text-sky-600 px-1 text-xs transition"
                                    title="ทำสำเนาฟิลด์"
                                  >
                                    ⎘
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteField(field.id, e)}
                                    className="text-slate-400 hover:text-red-500 px-1 text-xs transition"
                                    title="ลบฟิลด์นี้"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}

                              {/* Render Field Content */}
                              {renderWorkspaceField(field)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================================
                  PART 3: FOOTER (ส่วนท้ายเอกสาร - 🔒 ล็อคตามมาตรฐาน ISO)
                 ======================================================== */}
              <div className="w-full relative mt-5 pt-3 border-t border-sky-100 select-none bg-sky-50/30 p-3.5 sm:p-4 rounded-xl">
                {/* Footer Lock Indicator */}
                <div className="mb-2.5 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 font-semibold text-sky-800">
                    <span className="text-sky-600 text-xs">🔒</span>
                    <span>ส่วนท้ายเอกสาร (Footer) — ช่องลงนามรับรองมาตรฐาน</span>
                  </span>
                  <span className="rounded-full bg-white border border-sky-150 px-2 py-0.5 text-[10px] font-semibold text-sky-700 shadow-2xs">
                    ISO Standard Footer
                  </span>
                </div>

                {/* Clean White-Blue Signature Cards in Footer */}
                <div className="mb-3 rounded-lg border border-sky-200/90 bg-white overflow-hidden shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-sky-100">
                    {/* Sign 1: Prepared / Inspector */}
                    <div className="p-3 text-center flex flex-col justify-between min-h-[115px]">
                      <div className="text-[11px] font-semibold text-slate-800 pb-1 border-b border-sky-50">
                        ผู้ตรวจสอบและจัดทำ (Prepared By)
                      </div>
                      <div className="my-2 border border-dashed border-sky-200 rounded-md py-2 bg-sky-50/30">
                        <span className="text-xs font-semibold text-sky-700 font-serif italic">ลงนามอิเล็กทรอนิกส์</span>
                        <div className="text-[9px] text-slate-400 mt-0.5">(ชื่อผู้ปฏิบัติงาน)</div>
                      </div>
                      <div className="text-[9px] text-slate-400 flex justify-between px-1">
                        <span>จนท. คุณภาพ</span>
                        <span>วว/ดด/ปปปป</span>
                      </div>
                    </div>

                    {/* Sign 2: Reviewed / Supervisor */}
                    <div className="p-3 text-center flex flex-col justify-between min-h-[115px]">
                      <div className="text-[11px] font-semibold text-slate-800 pb-1 border-b border-sky-50">
                        ผู้ทบทวน (Reviewed By)
                      </div>
                      <div className="my-2 border border-dashed border-sky-200 rounded-md py-2 bg-sky-50/30">
                        <span className="text-xs font-semibold text-sky-700 font-serif italic">ลงนามอิเล็กทรอนิกส์</span>
                        <div className="text-[9px] text-slate-400 mt-0.5">(หัวหน้าแผนก)</div>
                      </div>
                      <div className="text-[9px] text-slate-400 flex justify-between px-1">
                        <span>หัวหน้างาน</span>
                        <span>วว/ดด/ปปปป</span>
                      </div>
                    </div>

                    {/* Sign 3: Approved / QMR */}
                    <div className="p-3 text-center flex flex-col justify-between min-h-[115px]">
                      <div className="text-[11px] font-semibold text-slate-800 pb-1 border-b border-sky-50">
                        ผู้อนุมัติ (Approved By)
                      </div>
                      <div className="my-2 border border-dashed border-sky-200 rounded-md py-2 bg-sky-50/30">
                        <span className="text-xs font-semibold text-sky-700 font-serif italic">ลงนามอิเล็กทรอนิกส์</span>
                        <div className="text-[9px] text-slate-400 mt-0.5">(ผู้จัดการ / QMR)</div>
                      </div>
                      <div className="text-[9px] text-slate-400 flex justify-between px-1">
                        <span>QMR / ผจก.</span>
                        <span>วว/ดด/ปปปป</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ISO Ownership Notice & Page Details */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1">
                  <p>
                    เอกสารนี้เป็นกรรมสิทธิ์ของบริษัท ห้ามคัดลอก ทำซ้ำ หรือเผยแพร่โดยไม่ได้รับอนุญาตตาม ISO 9001: 7.5.3
                  </p>
                  <div className="text-right text-sky-700 font-medium">
                    <span>รหัส: {template.documentCode} | หน้า 1 จาก 1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT: Toolbox & Properties Inspector (Compact & Clean White-Blue Theme) */}
        {showSidebar && (
          <aside className="w-72 sm:w-80 shrink-0 border-l border-sky-100 bg-white flex flex-col shadow-lg z-20 absolute lg:relative inset-y-0 right-0 max-w-[90vw]">
            {/* Sidebar Header with Close button on small screens */}
            <div className="flex items-center justify-between border-b border-sky-100 px-3.5 py-2.5 bg-sky-50/40">
              <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                <span>🧰</span>
                <span>แถบเครื่องมือ</span>
              </span>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-slate-400 hover:text-sky-700 p-1 text-xs rounded hover:bg-sky-100/60 transition"
                title="ปิดแถบเครื่องมือ"
              >
                ✕
              </button>
            </div>

            {/* Tabs: Toolbox vs Properties */}
            <div className="flex border-b border-sky-100 bg-white">
              <button
                onClick={() => setActiveTab("toolbox")}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${
                  activeTab === "toolbox"
                    ? "border-sky-600 text-sky-700 bg-sky-50/50"
                    : "border-transparent text-slate-500 hover:text-sky-600"
                }`}
              >
                รายการ Inputs
              </button>
              <button
                onClick={() => setActiveTab("properties")}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${
                  activeTab === "properties"
                    ? "border-sky-600 text-sky-700 bg-sky-50/50"
                    : "border-transparent text-slate-500 hover:text-sky-600"
                }`}
              >
                ตั้งค่าช่องข้อมูล
                {selectedField && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-sky-500" />}
              </button>
            </div>

            {/* Tab Content: Toolbox (Compact 2-Column Grid) */}
            {activeTab === "toolbox" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3.5 bg-white">
                {/* Category 1: Inputs */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>✏️</span>
                    <span>ช่องกรอกข้อมูล</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEFAULT_PALETTE_ITEMS.filter((i) => i.category === "input").map((item) => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-field-type", item.type);
                        }}
                        onClick={() => handleAddField(item.type)}
                        title={`คลิกหรือลาก: ${item.label}`}
                        className="group flex items-center gap-2 rounded-lg border border-sky-100 bg-white p-2 text-left transition hover:border-sky-400 hover:bg-sky-50/50 hover:shadow-2xs cursor-pointer select-none"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sm group-hover:scale-105 transition">
                          {item.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-700 group-hover:text-sky-700 truncate">
                            {item.shortLabel}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category 2: Selections */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>🔘</span>
                    <span>ตัวเลือก</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEFAULT_PALETTE_ITEMS.filter((i) => i.category === "selection").map((item) => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-field-type", item.type);
                        }}
                        onClick={() => handleAddField(item.type)}
                        title={`คลิกหรือลาก: ${item.label}`}
                        className="group flex items-center gap-2 rounded-lg border border-sky-100 bg-white p-2 text-left transition hover:border-sky-400 hover:bg-sky-50/50 hover:shadow-2xs cursor-pointer select-none"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sm group-hover:scale-105 transition">
                          {item.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-700 group-hover:text-sky-700 truncate">
                            {item.shortLabel}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category 3: Layout & Tables */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>📊</span>
                    <span>โครงสร้าง & ตาราง</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEFAULT_PALETTE_ITEMS.filter((i) => i.category === "layout").map((item) => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-field-type", item.type);
                        }}
                        onClick={() => handleAddField(item.type)}
                        title={`คลิกหรือลาก: ${item.label}`}
                        className={`group flex items-center gap-2 rounded-lg border border-sky-100 bg-white p-2 text-left transition hover:border-sky-400 hover:bg-sky-50/50 hover:shadow-2xs cursor-pointer select-none ${
                          item.type === "section" ? "col-span-2" : ""
                        }`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sm group-hover:scale-105 transition">
                          {item.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-700 group-hover:text-sky-700 truncate">
                            {item.shortLabel}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Signature Notice */}
                <div className="mt-4 rounded-lg border border-sky-150 bg-sky-50/50 p-2.5 text-center">
                  <div className="text-[11px] font-semibold text-sky-800 flex items-center justify-center gap-1">
                    <span>✍️</span>
                    <span>ช่องลงนามรับรอง</span>
                  </div>
                  <p className="text-[10px] text-sky-600 mt-0.5">
                    ถูกจัดวางไว้ในส่วน <strong>Footer</strong> อัตโนมัติตามมาตรฐาน ISO
                  </p>
                </div>
              </div>
            )}

            {/* Tab Content: Properties Inspector */}
            {activeTab === "properties" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {selectedField ? (
                  <>
                    <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        แก้ไข: <span className="text-sky-600 font-mono uppercase">{selectedField.type}</span>
                      </span>
                      <button
                        onClick={() => handleDeleteField(selectedField.id)}
                        className="text-xs text-red-500 hover:text-red-700 shrink-0 ml-2 font-medium"
                      >
                        ลบฟิลด์นี้ ✕
                      </button>
                    </div>

                    {/* Label */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        ชื่อฟิลด์ / คำอธิบาย (Label)
                      </label>
                      <input
                        type="text"
                        value={selectedField.label}
                        onChange={(e) =>
                          updateSelectedField((f) => ({ ...f, label: e.target.value }))
                        }
                        className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-hidden transition"
                      />
                    </div>

                    {/* Placeholder */}
                    {selectedField.type !== "section" &&
                      selectedField.type !== "checkbox" &&
                      selectedField.type !== "signature" &&
                      selectedField.type !== "table" && (
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            ข้อความตัวอย่าง (Placeholder)
                          </label>
                          <input
                            type="text"
                            value={selectedField.placeholder || ""}
                            onChange={(e) =>
                              updateSelectedField((f) => ({ ...f, placeholder: e.target.value }))
                            }
                            className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-hidden transition"
                          />
                        </div>
                      )}

                    {/* Width Layout */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        ความกว้างในแถว (Layout Width)
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["full", "half", "third"] as const).map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => updateSelectedField((f) => ({ ...f, width: w }))}
                            className={`rounded-lg py-1.5 text-center text-[11px] font-medium border transition ${
                              selectedField.width === w || (!selectedField.width && w === "full")
                                ? "border-sky-500 bg-sky-50 text-sky-700 font-bold"
                                : "border-slate-200 text-slate-600 hover:bg-sky-50/50"
                            }`}
                          >
                            {w === "full" ? "100%" : w === "half" ? "50%" : "33%"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Required Toggle */}
                    {selectedField.type !== "section" && selectedField.type !== "note" && (
                      <div className="flex items-center justify-between rounded-lg border border-sky-100 p-2.5 bg-sky-50/30">
                        <div>
                          <div className="text-xs font-bold text-slate-800">จำเป็นต้องกรอก (Required)</div>
                          <div className="text-[10px] text-slate-400">พนักงานต้องใส่ข้อมูลก่อนส่งฟอร์ม</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedField.required)}
                          onChange={(e) =>
                            updateSelectedField((f) => ({ ...f, required: e.target.checked }))
                          }
                          className="h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                        />
                      </div>
                    )}

                    {/* Unit (for Number) */}
                    {selectedField.type === "number" && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          หน่วยวัด (Unit) เช่น mm, kg, °C, pcs
                        </label>
                        <input
                          type="text"
                          value={selectedField.unit || ""}
                          onChange={(e) =>
                            updateSelectedField((f) => ({ ...f, unit: e.target.value }))
                          }
                          placeholder="เช่น mm, °C"
                          className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden transition"
                        />
                      </div>
                    )}

                    {/* Options (for Select / Radio) */}
                    {(selectedField.type === "select" || selectedField.type === "radio") && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-slate-700">
                            รายการตัวเลือก (Options)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = selectedField.options || [];
                              updateSelectedField((f) => ({
                                ...f,
                                options: [...cur, `ตัวเลือกที่ ${cur.length + 1}`],
                              }));
                            }}
                            className="text-[11px] text-sky-600 hover:underline font-semibold"
                          >
                            + เพิ่มตัวเลือก
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {(selectedField.options || []).map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...(selectedField.options || [])];
                                  newOpts[oIdx] = e.target.value;
                                  updateSelectedField((f) => ({ ...f, options: newOpts }));
                                }}
                                className="flex-1 rounded-md border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newOpts = (selectedField.options || []).filter((_, i) => i !== oIdx);
                                  updateSelectedField((f) => ({ ...f, options: newOpts }));
                                }}
                                className="text-slate-400 hover:text-red-500 text-xs px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Columns (for Table) */}
                    {selectedField.type === "table" && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-slate-700">
                            หัวคอลัมน์ตาราง (Columns)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = selectedField.columns || [];
                              updateSelectedField((f) => ({
                                ...f,
                                columns: [...cur, `คอลัมน์ ${cur.length + 1}`],
                              }));
                            }}
                            className="text-[11px] text-sky-600 hover:underline font-semibold"
                          >
                            + เพิ่มคอลัมน์
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {(selectedField.columns || []).map((col, cIdx) => (
                            <div key={cIdx} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={col}
                                onChange={(e) => {
                                  const newCols = [...(selectedField.columns || [])];
                                  newCols[cIdx] = e.target.value;
                                  updateSelectedField((f) => ({ ...f, columns: newCols }));
                                }}
                                className="flex-1 rounded-md border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newCols = (selectedField.columns || []).filter((_, i) => i !== cIdx);
                                  updateSelectedField((f) => ({ ...f, columns: newCols }));
                                }}
                                className="text-slate-400 hover:text-red-500 text-xs px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <span className="text-3xl block mb-2 opacity-50">👆</span>
                    <p className="text-xs">คลิกเลือกฟิลด์ใน Workspace เพื่อแก้ไขคุณสมบัติ</p>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/** Helper renderer for Workspace items */
function renderWorkspaceField(field: FormField) {
  if (field.type === "section") {
    return (
      <div className="border-b-2 border-sky-500 pb-1.5 pt-1">
        <span className="text-xs font-bold text-sky-900 tracking-wide uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-600 inline-block" />
          {field.label}
        </span>
      </div>
    );
  }

  if (field.type === "note") {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-2.5 text-xs text-sky-950 leading-relaxed">
        💡 {field.label}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold text-slate-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {field.unit && <span className="text-[10px] text-sky-700 font-medium">({field.unit})</span>}
      </div>

      {field.type === "text" && (
        <input
          type="text"
          readOnly
          placeholder={field.placeholder || "ข้อความสั้น..."}
          className="w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-500 pointer-events-none"
        />
      )}

      {field.type === "number" && (
        <div className="relative">
          <input
            type="text"
            readOnly
            placeholder={field.placeholder || "0.00"}
            className="w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-500 pointer-events-none"
          />
          {field.unit && (
            <span className="absolute right-2.5 top-1.5 text-[10px] text-sky-600 font-semibold">
              {field.unit}
            </span>
          )}
        </div>
      )}

      {field.type === "textarea" && (
        <textarea
          readOnly
          rows={2}
          placeholder={field.placeholder || "กรอกข้อความยาว..."}
          className="w-full rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-500 pointer-events-none resize-none"
        />
      )}

      {field.type === "date" && (
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-400">
          <span>วว/ดด/ปปปป</span>
          <span>📅</span>
        </div>
      )}

      {field.type === "select" && (
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-500">
          <span>{field.options?.[0] || "-- เลือกรายการ --"}</span>
          <span className="text-[10px] text-sky-600">▼</span>
        </div>
      )}

      {field.type === "radio" && (
        <div className="flex flex-wrap gap-3 pt-1">
          {(field.options || ["ตัวเลือก 1", "ตัวเลือก 2"]).map((opt, i) => (
            <label key={i} className="flex items-center gap-1.5 text-xs text-slate-700">
              <input type="radio" disabled checked={i === 0} className="h-3.5 w-3.5 text-sky-600" />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === "checkbox" && (
        <label className="flex items-center gap-2 pt-1 text-xs text-slate-700">
          <input type="checkbox" disabled className="h-4 w-4 rounded text-sky-600" />
          <span>{field.placeholder || "ยืนยันการตรวจสอบ"}</span>
        </label>
      )}

      {field.type === "table" && (
        <div className="w-full overflow-x-auto rounded-lg border border-sky-100">
          <table className="w-full min-w-[420px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-sky-50/60 text-sky-900">
                {(field.columns || ["ลำดับ", "รายการ", "ผลตรวจ"]).map((c, i) => (
                  <th key={i} className="border-b border-r border-sky-100 px-2.5 py-1.5 text-left font-bold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sky-50">
                {(field.columns || ["ลำดับ", "รายการ", "ผลตรวจ"]).map((_, i) => (
                  <td key={i} className="border-r border-sky-50 px-2.5 py-1.5 text-slate-400">
                    -
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div className="bg-sky-50/30 p-1.5 text-center text-[10px] text-sky-600 font-medium">
            + พนักงานสามารถกดเพิ่มแถวได้ในโหมดกรอกฟอร์ม
          </div>
        </div>
      )}
    </div>
  );
}
