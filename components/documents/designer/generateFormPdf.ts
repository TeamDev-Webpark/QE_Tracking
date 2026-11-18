import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { FormTemplate, FormSubmission } from "./types";

function escapeHtml(str: unknown): string {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatThaiDate(dateStr: string): string {
  if (!dateStr || dateStr === "-") return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** Check if a signature string is truly filled with a legitimate name (and not blank, dash, or dummy numbers). */
function isValidSignature(val: unknown): boolean {
  if (!val) return false;
  const str = String(val).trim();
  if (!str || str === "-" || str === "–" || str === "ลงนามแล้ว") return false;
  // If it's purely digits (such as test numbers 1534, 843534), treat as not signed
  if (/^\d+$/.test(str)) return false;
  return true;
}

export async function generateFormSubmissionPdf({
  template,
  submission,
  orgName = "บริษัท ควอลิตี้ แมนูแฟคเจอริ่ง จำกัด",
  isControlled = true,
  fileName,
}: {
  template: FormTemplate;
  submission: FormSubmission;
  orgName?: string;
  isControlled?: boolean;
  fileName?: string;
}): Promise<void> {
  const container = document.createElement("div");
  container.id = "form-pdf-target";
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px"; // Standard A4 width at 96 DPI
  container.style.minHeight = "1123px"; // Standard A4 height at 96 DPI
  container.style.padding = "30px 34px";
  container.style.boxSizing = "border-box";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#0f172a";
  container.style.fontFamily = "'Sarabun', 'TH Sarabun New', 'Segoe UI', Tahoma, Arial, sans-serif";
  container.style.fontSize = "12px";
  container.style.lineHeight = "1.55";
  container.style.zIndex = "-1000";

  // Build rendered fields HTML
  let fieldsHtml = "";
  let inFlexGroup = false;

  const closeFlexGroup = () => {
    if (inFlexGroup) {
      fieldsHtml += `</div>`;
      inFlexGroup = false;
    }
  };

  const openFlexGroup = () => {
    if (!inFlexGroup) {
      fieldsHtml += `<div style="display: flex; flex-wrap: wrap; justify-content: space-between; margin-bottom: 4px;">`;
      inFlexGroup = true;
    }
  };

  for (const field of template.fields) {
    const val = submission.values[field.id];

    if (field.type === "section") {
      closeFlexGroup();
      fieldsHtml += `
        <div style="background: #f8fafc; border-left: 4px solid #1e293b; border-top: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; border-bottom: 1.5px solid #1e293b; padding: 6px 12px; font-weight: 800; font-size: 12px; color: #0f172a; margin-top: 10px; margin-bottom: 6px; line-height: 1.5;">
          ${escapeHtml(field.label)}
        </div>
      `;
      continue;
    }

    if (field.type === "note") {
      closeFlexGroup();
      fieldsHtml += `
        <div style="width: 100%; margin-bottom: 8px; background: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; padding: 8px 12px; font-size: 11px; color: #0369a1; border-radius: 4px; line-height: 1.5;">
          💡 <strong>คำแนะนำ / Note:</strong> ${escapeHtml(field.label)}
        </div>
      `;
      continue;
    }

    if (field.type === "table") {
      closeFlexGroup();
      const rows = Array.isArray(val) ? (val as Record<string, unknown>[]) : [];
      const cols =
        field.columns && field.columns.length > 0
          ? field.columns
          : ["ชิ้นที่", "ความกว้าง (mm)", "ความยาว (mm)", "ความหนา (mm)", "ผลประเมิน"];

      // Pad to at least 3 rows for official inspection look
      const displayRows: (Record<string, unknown> | null)[] = [...rows];
      while (displayRows.length < 3) {
        displayRows.push(null);
      }

      const tableRowsHtml = displayRows
        .map((r, rIdx) => {
          if (!r) {
            return `
              <tr style="border-bottom: 1px solid #e2e8f0; height: 26px;">
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700; color: #64748b; background: #fafafa;">${rIdx + 1}</td>
                ${cols.slice(1).map(() => `<td style="padding: 5px 8px; border: 1px solid #cbd5e1;">&nbsp;</td>`).join("")}
              </tr>
            `;
          }
          return `
            <tr style="border-bottom: 1px solid #e2e8f0; height: 26px;">
              ${cols.map((_, cIdx) => {
                const cellVal = r[`col_${cIdx}`];
                const cellStr = cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== "" ? String(cellVal).trim() : "";
                const isFirst = cIdx === 0;
                return `<td style="padding: 5px 8px; border: 1px solid #cbd5e1; ${isFirst ? "font-weight: 700; background: #fafafa;" : ""}">${cellStr ? escapeHtml(cellStr) : "&nbsp;"}</td>`;
              }).join("")}
            </tr>
          `;
        })
        .join("");

      fieldsHtml += `
        <div style="width: 100%; margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 11px; color: #334155; margin-bottom: 4px; line-height: 1.4;">${escapeHtml(field.label)}</div>
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #1e293b; font-size: 11px; text-align: center;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #1e293b; color: #0f172a;">
                ${cols.map((c) => `<th style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 800;">${escapeHtml(c)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </div>
      `;
      continue;
    }

    if (field.type === "signature") {
      closeFlexGroup();
      // Handled in formal bottom block
      continue;
    }

    // Standard inputs (text, number, date, select, radio, textarea)
    openFlexGroup();

    const isFull = field.width === "full" || field.type === "textarea";
    const isThird = field.width === "third";
    const widthStyle = isFull ? "width: 100%;" : isThird ? "width: 32%;" : "width: 49%;";

    const isFilled = val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "-";
    let displayVal = isFilled ? String(val).trim() : "";
    const unitText = isFilled && field.unit ? ` ${field.unit}` : "";

    // Format ISO date strings if detected
    if (isFilled && field.type === "date" && /^\d{4}-\d{2}-\d{2}/.test(displayVal)) {
      displayVal = formatThaiDate(displayVal);
    }

    // Judgement badges
    let valueBadge = isFilled
      ? `<span style="color: #0f172a;">${escapeHtml(displayVal)}${escapeHtml(unitText)}</span>`
      : `<span>&nbsp;</span>`;

    if (isFilled) {
      if (
        displayVal.includes("ผ่านเกณฑ์") ||
        displayVal.toLowerCase().includes("pass") ||
        displayVal.toLowerCase().includes("accepted")
      ) {
        valueBadge = `
          <div style="text-align: center; width: 100%; margin: 4px 0 2px 0;">
            <span style="display: inline-block; background: #dcfce7; color: #15803d; border: 1.5px solid #86efac; border-radius: 4px; font-weight: 800; font-size: 11px; font-family: Tahoma, 'Segoe UI', Arial, sans-serif; padding: 2px 16px 7px 16px; line-height: 1.1; text-align: center; box-sizing: border-box; vertical-align: middle;">
              ✓ ${escapeHtml(displayVal)}
            </span>
          </div>
        `;
      } else if (
        displayVal.includes("ไม่ผ่าน") ||
        displayVal.toLowerCase().includes("reject") ||
        displayVal.toLowerCase().includes("fail")
      ) {
        valueBadge = `
          <div style="text-align: center; width: 100%; margin: 4px 0 2px 0;">
            <span style="display: inline-block; background: #fee2e2; color: #b91c1c; border: 1.5px solid #fca5a5; border-radius: 4px; font-weight: 800; font-size: 11px; font-family: Tahoma, 'Segoe UI', Arial, sans-serif; padding: 2px 16px 7px 16px; line-height: 1.1; text-align: center; box-sizing: border-box; vertical-align: middle;">
              ✗ ${escapeHtml(displayVal)}
            </span>
          </div>
        `;
      } else if (
        displayVal.includes("ส่งให้วิศวกร") ||
        displayVal.includes("พิจารณา") ||
        displayVal.toLowerCase().includes("review")
      ) {
        valueBadge = `
          <div style="text-align: center; width: 100%; margin: 4px 0 2px 0;">
            <span style="display: inline-block; background: #fef3c7; color: #b45309; border: 1.5px solid #fcd34d; border-radius: 4px; font-weight: 800; font-size: 11px; font-family: Tahoma, 'Segoe UI', Arial, sans-serif; padding: 2px 16px 7px 16px; line-height: 1.1; text-align: center; box-sizing: border-box; vertical-align: middle;">
              ⏳ ${escapeHtml(displayVal)}
            </span>
          </div>
        `;
      }
    }

    if (field.type === "textarea") {
      fieldsHtml += `
        <div style="width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; padding: 8px 12px; margin-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 4px; line-height: 1.4;">
            ${escapeHtml(field.label)}
          </div>
          <div style="font-size: 11.5px; color: #1e293b; min-height: 38px; line-height: 1.6; white-space: pre-wrap;">
            ${isFilled ? escapeHtml(displayVal) : "&nbsp;"}
          </div>
        </div>
      `;
    } else {
      fieldsHtml += `
        <div style="${widthStyle} box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; padding: 7px 10px; margin-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 6px; line-height: 1.4;">
            ${escapeHtml(field.label)} ${field.required ? '<span style="color: #dc2626;">*</span>' : ""}
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #0f172a; min-height: 24px; line-height: 1.4;">
            ${valueBadge}
          </div>
        </div>
      `;
    }
  }

  closeFlexGroup();

  // Signature validation: only show official stamp if a legitimate, non-numeric name was entered
  const preparedRaw = submission.values["footer_sign_prepared"] || submission.filledBy.name;
  const hasPreparedSign = isValidSignature(preparedRaw);
  const preparedName = hasPreparedSign ? String(preparedRaw).trim() : "";

  const reviewedRaw = submission.values["footer_sign_reviewed"];
  const hasReviewedSign = isValidSignature(reviewedRaw);
  const reviewedName = hasReviewedSign ? String(reviewedRaw).trim() : "";

  const approvedRaw = submission.values["footer_sign_approved"];
  const hasApprovedSign = isValidSignature(approvedRaw);
  const approvedName = hasApprovedSign ? String(approvedRaw).trim() : "";

  const effectiveThai = formatThaiDate(submission.filledAt);
  const printedTime = new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  container.innerHTML = `
    <!-- Outer Formal Document Border -->
    <div style="border: 2px solid #1e293b; padding: 22px 24px; min-height: 1040px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative; background: #ffffff;">

      <!-- Controlled Stamp Watermark in background -->
      <div style="position: absolute; top: 48%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 48px; font-weight: 900; color: ${isControlled ? "rgba(185, 28, 28, 0.04)" : "rgba(71, 85, 105, 0.04)"}; pointer-events: none; white-space: nowrap; z-index: 0; user-select: none;">
        ${isControlled ? "CONTROLLED COPY · สำเนาควบคุม" : "UNCONTROLLED COPY"}
      </div>

      <!-- Top Formal Header Block -->
      <div style="position: relative; z-index: 1;">
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #1e293b; margin-bottom: 10px;">
          <tr>
            <!-- Left: Official Emblem & Department Name -->
            <td style="width: 24%; vertical-align: middle; border-right: 1.5px solid #1e293b; padding: 10px 12px; text-align: center; background-color: #f8fafc;">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none" style="margin: 0 auto 3px auto; display: block;">
                <circle cx="24" cy="24" r="22" stroke="#1e293b" stroke-width="2" fill="#ffffff" />
                <circle cx="24" cy="24" r="18" stroke="#0369a1" stroke-width="1.2" stroke-dasharray="3 2" fill="none" />
                <path d="M24 8 L27 17 L36 17 L29 23 L32 32 L24 26 L16 32 L19 23 L12 17 L21 17 Z" fill="#0284c7" stroke="#0369a1" stroke-width="0.8" />
                <circle cx="24" cy="22" r="5" fill="#ffffff" stroke="#0284c7" stroke-width="1" />
              </svg>
              <div style="font-size: 10.5px; font-weight: 800; color: #0f172a; line-height: 1.4;">ระบบบริหารงานคุณภาพ</div>
              <div style="font-size: 9px; color: #475569; margin-top: 1px; line-height: 1.4;">ศูนย์ควบคุมเอกสาร (DCC)</div>
              <div style="font-size: 8.5px; color: #64748b; line-height: 1.4;">ตามมาตรฐาน ISO 9001:2015</div>
            </td>

            <!-- Center: Form Title & Organization -->
            <td style="width: 45%; vertical-align: middle; text-align: center; padding: 10px 14px;">
              <div style="font-size: 10.5px; font-weight: 700; color: #475569; line-height: 1.4;">${escapeHtml(orgName)}</div>
              <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 3px; line-height: 1.4;">${escapeHtml(template.title)}</div>
              <div style="font-size: 10px; font-weight: 600; color: #0284c7; margin-top: 3px; line-height: 1.4;">
                แบบฟอร์มบันทึกคุณภาพตามระบบ ISO 9001:2015 ข้อ 7.5.3
              </div>
            </td>

            <!-- Right: Document Control Grid -->
            <td style="width: 31%; vertical-align: top; border-left: 1.5px solid #1e293b; padding: 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
                <tr style="border-bottom: 1px solid #1e293b;">
                  <td style="padding: 5px 8px; color: #475569; font-weight: 700; border-right: 1px solid #cbd5e1; width: 40%; white-space: nowrap;">รหัสเอกสาร</td>
                  <td style="padding: 5px 8px; font-weight: 800; color: #0f172a; white-space: nowrap;">${escapeHtml(template.documentCode)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #1e293b;">
                  <td style="padding: 5px 8px; color: #475569; font-weight: 700; border-right: 1px solid #cbd5e1; white-space: nowrap;">แก้ไขครั้งที่</td>
                  <td style="padding: 5px 8px; font-weight: 800; color: #0f172a; white-space: nowrap;">Rev. ${String(template.revision).padStart(2, "0")}</td>
                </tr>
                <tr style="border-bottom: 1px solid #1e293b;">
                  <td style="padding: 5px 8px; color: #475569; font-weight: 700; border-right: 1px solid #cbd5e1; white-space: nowrap;">วันที่บันทึก</td>
                  <td style="padding: 5px 8px; font-weight: 700; color: #0f172a; font-size: 10px; white-space: nowrap;">${effectiveThai}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 8px; color: #475569; font-weight: 700; border-right: 1px solid #cbd5e1; white-space: nowrap;">จำนวนหน้า</td>
                  <td style="padding: 5px 8px; font-weight: 700; color: #0f172a; white-space: nowrap;">๑ / ๑</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Formal Controlled Copy Status Banner -->
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${isControlled ? "#dc2626" : "#64748b"}; background: ${isControlled ? "#fef2f2" : "#f8fafc"}; margin-bottom: 10px; border-radius: 4px;">
          <tr>
            <td style="padding: 6px 12px; vertical-align: middle; white-space: nowrap;">
              <table style="display: inline-table; vertical-align: middle; border-collapse: collapse; margin-right: 10px;">
                <tr>
                  <td style="background: ${isControlled ? "#b91c1c" : "#475569"}; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 900; font-size: 10px; height: 22px; padding: 0 10px; border-radius: 3px; vertical-align: middle; text-align: center; line-height: 22px; white-space: nowrap;">
                    ${isControlled ? "CONTROLLED COPY" : "UNCONTROLLED"}
                  </td>
                </tr>
              </table>
              <span style="font-size: 10.5px; color: ${isControlled ? "#991b1b" : "#334155"}; font-weight: 700; vertical-align: middle; line-height: 1.4;">
                ${isControlled ? "เอกสารควบคุมระบบ DCC · ห้ามทำซ้ำภายนอกระบบ" : "เอกสารไม่ควบคุม · เพื่อการอ้างอิงเท่านั้น"}
              </span>
            </td>
            <td style="padding: 6px 12px; text-align: right; vertical-align: middle; white-space: nowrap; font-size: 10px; color: #1e293b; line-height: 1.4;">
              <strong>ผู้บันทึก:</strong> ${escapeHtml(submission.filledBy.name)} <span style="color: #64748b;">(${escapeHtml(submission.filledBy.department || "-")})</span>
            </td>
          </tr>
        </table>

        <!-- Rendered Workspace Fields -->
        <div style="font-size: 11px;">
          ${fieldsHtml}
        </div>
      </div>

      <!-- Bottom Approval & Signatures Block -->
      <div style="position: relative; z-index: 1;">
        <div style="margin-top: 10px; margin-bottom: 6px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; border-bottom: 1.5px solid #1e293b; padding-bottom: 3px; margin-bottom: 6px; line-height: 1.4;">
            การรับรองผลและการลงนามอนุมัติ (Inspection Sign-off & Approvals)
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #1e293b; text-align: center; font-size: 10.5px;">
            <tr style="background-color: #f8fafc; border-bottom: 1.5px solid #1e293b; font-weight: 800; color: #0f172a;">
              <td style="width: 33.33%; padding: 6px; border-right: 1px solid #1e293b;">ผู้ตรวจสอบและบันทึก (Inspected by)</td>
              <td style="width: 33.33%; padding: 6px; border-right: 1px solid #1e293b;">ผู้ทบทวนผล (Reviewed by)</td>
              <td style="width: 33.33%; padding: 6px;">ผู้อนุมัติ (Approved by)</td>
            </tr>
            <tr>
              <!-- Column 1: Prepared -->
              <td style="padding: 12px 10px 8px; border-right: 1px solid #1e293b; vertical-align: bottom;">
                ${
                  hasPreparedSign
                    ? `
                  <div style="border: 1px dashed #0284c7; background: #f0f9ff; border-radius: 4px; padding: 6px 10px; margin: 0 auto 5px auto; width: 85%; box-sizing: border-box; text-align: center; min-height: 44px;">
                    <div style="font-size: 8.5px; font-weight: 700; color: #0369a1; line-height: 1.3;">[ ลงนามดิจิทัล / VERIFIED ]</div>
                    <div style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 1.5; margin-top: 2px;">
                      ${escapeHtml(preparedName)}
                    </div>
                  </div>
                  <div style="color: #475569; font-size: 10px; line-height: 1.4;">( เจ้าหน้าที่ควบคุมคุณภาพ / Inspector )</div>
                  <div style="color: #64748b; font-size: 9.5px; margin-top: 2px; line-height: 1.4;">วันที่: ${effectiveThai}</div>
                `
                    : `
                  <div style="border: 1.5px dashed #cbd5e1; background: #f8fafc; border-radius: 4px; padding: 6px 10px; margin: 0 auto 5px auto; width: 85%; box-sizing: border-box; text-align: center; min-height: 44px;">
                    <div style="font-size: 8.5px; font-weight: 700; color: #94a3b8; line-height: 1.3;">[ DIGITAL SIGNATURE ]</div>
                    <div style="font-size: 12px; font-weight: 600; color: #cbd5e1; line-height: 1.5; margin-top: 2px;">
                      &nbsp;
                    </div>
                  </div>
                  <div style="color: #475569; font-size: 10px; line-height: 1.4;">( เจ้าหน้าที่ควบคุมคุณภาพ / Inspector )</div>
                  <div style="color: #94a3b8; font-size: 9.5px; margin-top: 2px; line-height: 1.4;">วันที่: –</div>
                `
                }
              </td>

              <!-- Column 2: Reviewed -->
              <td style="padding: 12px 10px 8px; border-right: 1px solid #1e293b; vertical-align: bottom;">
                ${
                  hasReviewedSign
                    ? `
                  <div style="border: 1px dashed #0284c7; background: #f0f9ff; border-radius: 4px; padding: 6px 10px; margin: 0 auto 5px auto; width: 85%; box-sizing: border-box; text-align: center; min-height: 44px;">
                    <div style="font-size: 9px; font-weight: 700; color: #0369a1; line-height: 1.3;">[ ตรวจสอบแล้ว / REVIEWED ]</div>
                    <div style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 1.5; margin-top: 2px;">
                      ${escapeHtml(reviewedName)}
                    </div>
                  </div>
                  <div style="color: #475569; font-size: 10px; line-height: 1.4;">( หัวหน้าแผนก / QE Supervisor )</div>
                  <div style="color: #64748b; font-size: 9.5px; margin-top: 2px; line-height: 1.4;">วันที่: ${effectiveThai}</div>
                `
                    : `
                  <div style="border: 1.5px dashed #cbd5e1; background: #f8fafc; border-radius: 4px; padding: 6px 10px; margin: 0 auto 5px auto; width: 85%; box-sizing: border-box; text-align: center; min-height: 44px;">
                    <div style="font-size: 8.5px; font-weight: 700; color: #94a3b8; line-height: 1.3;">[ DIGITAL SIGNATURE ]</div>
                    <div style="font-size: 12px; font-weight: 600; color: #cbd5e1; line-height: 1.5; margin-top: 2px;">
                      &nbsp;
                    </div>
                  </div>
                  <div style="color: #475569; font-size: 10px; line-height: 1.4;">( หัวหน้าแผนก / QE Supervisor )</div>
                  <div style="color: #94a3b8; font-size: 9.5px; margin-top: 2px; line-height: 1.4;">วันที่: –</div>
                `
                }
              </td>

              <!-- Column 3: Approved -->
              <td style="padding: 12px 10px 8px; vertical-align: bottom;">
                ${
                  hasApprovedSign
                    ? `
                  <div style="border: 1.5px solid #16a34a; background: #f0fdf4; border-radius: 4px; padding: 6px 10px; margin: 0 auto 5px auto; width: 85%; box-sizing: border-box; text-align: center; min-height: 44px;">
                    <div style="font-size: 9px; font-weight: 800; color: #166534; line-height: 1.3;">[ อนุมัติแล้ว / APPROVED ]</div>
                    <div style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 1.5; margin-top: 2px;">
                      ${escapeHtml(approvedName)}
                    </div>
                  </div>
                  <div style="color: #475569; font-size: 10px; line-height: 1.4;">( ผู้จัดการฝ่ายประกันคุณภาพ / QA Manager )</div>
                  <div style="color: #64748b; font-size: 9.5px; margin-top: 2px; line-height: 1.4;">วันที่: ${effectiveThai}</div>
                `
                    : `
                  <div style="border: 1.5px dashed #cbd5e1; background: #f8fafc; border-radius: 4px; padding: 6px 10px; margin: 0 auto 5px auto; width: 85%; box-sizing: border-box; text-align: center; min-height: 44px;">
                    <div style="font-size: 8.5px; font-weight: 700; color: #94a3b8; line-height: 1.3;">[ DIGITAL SIGNATURE ]</div>
                    <div style="font-size: 12px; font-weight: 600; color: #cbd5e1; line-height: 1.5; margin-top: 2px;">
                      &nbsp;
                    </div>
                  </div>
                  <div style="color: #475569; font-size: 10px; line-height: 1.4;">( ผู้จัดการฝ่ายประกันคุณภาพ / QA Manager )</div>
                  <div style="color: #94a3b8; font-size: 9.5px; margin-top: 2px; line-height: 1.4;">วันที่: –</div>
                `
                }
              </td>
            </tr>
          </table>
        </div>

        <!-- Official Footer / Document Security Notice -->
        <div style="border-top: 1.5px solid #1e293b; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #475569;">
          <div>
            <strong>สำเนาอิเล็กทรอนิกส์:</strong> บันทึกโดย ${escapeHtml(submission.filledBy.name)} | วันที่พิมพ์: ${effectiveThai} (${printedTime} น.)
          </div>
          <div style="font-weight: 700; color: #0f172a;">
            หน้า ๑ / ๑ · ISO TRACKING SYSTEM
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    const safeTitle = template.title.replace(/[\/\\:*?"<>|]/g, "_");
    const saveName = fileName || `${template.documentCode}_${safeTitle}_Form.pdf`;
    pdf.save(saveName);
  } finally {
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  }
}
