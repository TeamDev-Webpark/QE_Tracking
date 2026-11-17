import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { FormField, FormTemplate, FormSubmission } from "./types";

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

export async function generateFormSubmissionPdf({
  template,
  submission,
  orgName = "บริษัท ควอลิตี้ แมนูแฟคเจอริ่ง จำกัด",
  isControlled = true,
}: {
  template: FormTemplate;
  submission: FormSubmission;
  orgName?: string;
  isControlled?: boolean;
}): Promise<void> {
  const container = document.createElement("div");
  container.id = "form-pdf-target";
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px"; // A4 at 96 DPI
  container.style.minHeight = "1123px";
  container.style.padding = "32px 36px";
  container.style.boxSizing = "border-box";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#0f172a";
  container.style.fontFamily = "'Noto Serif Thai', 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', sans-serif";
  container.style.fontSize = "12px";
  container.style.lineHeight = "1.5";
  container.style.zIndex = "-1000";

  const stampColor = isControlled ? "#b91c1c" : "#64748b";
  const stampText = isControlled ? "CONTROLLED COPY" : "UNCONTROLLED COPY";
  const stampSubtext = isControlled ? "เอกสารควบคุม - ห้ามทำสำเนาภายนอกระบบ" : "เอกสารไม่ควบคุม";

  // Render fields HTML
  let fieldsHtml = "";
  for (const field of template.fields) {
    const val = submission.values[field.id];

    if (field.type === "section") {
      fieldsHtml += `
        <div style="width: 100%; margin-top: 14px; margin-bottom: 8px; border-bottom: 1.5px solid #0284c7; padding-bottom: 4px;">
          <span style="font-weight: 700; font-size: 13px; color: #0369a1;">${field.label}</span>
        </div>
      `;
      continue;
    }

    if (field.type === "note") {
      fieldsHtml += `
        <div style="width: 100%; margin-bottom: 10px; background: #f0f9ff; border-left: 3px solid #0284c7; padding: 6px 10px; font-size: 11px; color: #0369a1;">
          ${field.label}
        </div>
      `;
      continue;
    }

    const widthStyle = field.width === "half" ? "width: 48%; display: inline-block; vertical-align: top; margin-right: 2%;" :
                       field.width === "third" ? "width: 31%; display: inline-block; vertical-align: top; margin-right: 2%;" :
                       "width: 100%; display: block;";

    if (field.type === "table") {
      const rows = Array.isArray(val) ? val : [];
      const cols = field.columns || ["ลำดับ", "รายการ", "ค่า"];
      let tableRows = "";
      if (rows.length === 0) {
        tableRows = `<tr><td colspan="${cols.length}" style="text-align: center; color: #94a3b8; padding: 8px;">ไม่มีข้อมูลรายการ</td></tr>`;
      } else {
        tableRows = rows.map((r: any, idx: number) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            ${cols.map((col, cIdx) => `<td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${r[`col_${cIdx}`] ?? "-"}</td>`).join("")}
          </tr>
        `).join("");
      }

      fieldsHtml += `
        <div style="width: 100%; margin-bottom: 12px;">
          <div style="font-weight: 600; font-size: 11px; color: #334155; margin-bottom: 4px;">${field.label}</div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 11px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                ${cols.map(c => `<th style="padding: 6px 8px; border: 1px solid #94a3b8; text-align: left; font-weight: 600;">${c}</th>`).join("")}
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      `;
      continue;
    }

    if (field.type === "signature") {
      fieldsHtml += `
        <div style="${widthStyle} margin-bottom: 14px;">
          <div style="font-weight: 600; font-size: 11px; color: #334155; margin-bottom: 4px;">${field.label}</div>
          <div style="border: 1px dashed #94a3b8; border-radius: 4px; padding: 12px; text-align: center; background: #fafafa;">
            <div style="font-size: 14px; font-weight: 700; color: #0284c7; font-family: cursive;">${val || submission.filledBy.name || "ลงนามแล้ว"}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">วันที่: ${formatThaiDate(submission.filledAt)}</div>
          </div>
        </div>
      `;
      continue;
    }

    // Default inputs (text, number, date, select, radio, textarea)
    const displayVal = val !== undefined && val !== null && val !== "" ? String(val) : "-";
    const unitText = field.unit ? ` ${field.unit}` : "";

    fieldsHtml += `
      <div style="${widthStyle} margin-bottom: 10px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">
          ${field.label} ${field.required ? '<span style="color: #ef4444;">*</span>' : ""}
        </div>
        <div style="border-bottom: 1px solid #94a3b8; padding: 4px 6px; font-weight: 600; font-size: 12px; color: #0f172a; min-height: 22px; background: #f8fafc;">
          ${displayVal}${unitText}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="border: 2px solid #0369a1; padding: 20px; min-height: 1040px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
      
      <!-- Controlled Stamp Watermark in background -->
      <div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 52px; font-weight: 900; color: ${isControlled ? 'rgba(185, 28, 28, 0.07)' : 'rgba(100, 116, 139, 0.07)'}; pointer-events: none; white-space: nowrap; border: 4px dashed ${isControlled ? 'rgba(185, 28, 28, 0.15)' : 'rgba(100, 116, 139, 0.15)'}; padding: 12px 30px; border-radius: 8px;">
        ${stampText}
      </div>

      <!-- Top Header Table -->
      <div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0369a1; margin-bottom: 14px;">
          <tr>
            <td style="width: 25%; border-right: 1.5px solid #0369a1; padding: 10px; text-align: center; vertical-align: middle; background-color: #f0f9ff;">
              <div style="font-size: 18px; font-weight: 800; color: #0284c7;">QE TRACKING</div>
              <div style="font-size: 9px; color: #0369a1; margin-top: 2px; font-weight: 600;">QUALITY MANAGEMENT</div>
            </td>
            <td style="width: 50%; border-right: 1.5px solid #0369a1; padding: 10px; text-align: center; vertical-align: middle;">
              <div style="font-size: 11px; color: #475569;">${orgName}</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 3px;">${template.title}</div>
              <div style="font-size: 10px; color: #0284c7; margin-top: 2px; font-weight: 600;">แบบฟอร์มบันทึกคุณภาพตามระบบ ISO 9001:2015</div>
            </td>
            <td style="width: 25%; padding: 8px 10px; vertical-align: top; font-size: 10px; line-height: 1.6; background-color: #f8fafc;">
              <div><strong>รหัสเอกสาร:</strong> ${template.documentCode}</div>
              <div><strong>ฉบับที่ (Rev):</strong> ${String(template.revision).padStart(2, "0")}</div>
              <div><strong>วันที่กรอก:</strong> ${formatThaiDate(submission.filledAt)}</div>
              <div><strong>สถานะ:</strong> ${submission.status.toUpperCase()}</div>
            </td>
          </tr>
        </table>

        <!-- Red/Blue Official Controlled Copy Box -->
        <div style="display: flex; justify-content: space-between; align-items: center; border: 1.2px solid ${stampColor}; background: ${isControlled ? '#fef2f2' : '#f0f9ff'}; padding: 6px 14px; margin-bottom: 14px; border-radius: 3px;">
          <div>
            <span style="display: inline-block; background: ${stampColor}; color: #ffffff; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 2px; letter-spacing: 0.5px;">${stampText}</span>
            <span style="font-size: 10px; color: ${stampColor}; margin-left: 8px; font-weight: 600;">${stampSubtext}</span>
          </div>
          <div style="font-size: 9px; color: #0369a1;">
            ผู้จัดทำ: <strong>${submission.filledBy.name}</strong> (${submission.filledBy.department || "-"})
          </div>
        </div>

        <!-- Rendered Workspace Fields -->
        <div style="font-size: 11px;">
          ${fieldsHtml}
        </div>
      </div>

      <!-- Footer Approval Signatures Block & Ownership -->
      <div>
        <table style="width: 100%; border-collapse: collapse; border: 1.2px solid #0369a1; margin-top: 14px; margin-bottom: 8px; font-size: 10px;">
          <tr style="background-color: #f0f9ff; border-bottom: 1px solid #0369a1;">
            <th style="width: 33.33%; padding: 5px; border-right: 1px solid #0369a1; text-align: center; font-weight: 700; color: #0369a1;">ผู้ตรวจสอบและจัดทำ (Prepared By)</th>
            <th style="width: 33.33%; padding: 5px; border-right: 1px solid #0369a1; text-align: center; font-weight: 700; color: #0369a1;">ผู้ทบทวน (Reviewed By)</th>
            <th style="width: 33.33%; padding: 5px; text-align: center; font-weight: 700; color: #0369a1;">ผู้อนุมัติ (Approved By)</th>
          </tr>
          <tr>
            <td style="padding: 10px 6px; border-right: 1px solid #0369a1; text-align: center; vertical-align: bottom; height: 50px;">
              <div style="font-size: 13px; font-weight: 700; color: #0284c7; font-family: cursive;">
                ${submission.values["footer_sign_prepared"] || submission.filledBy.name || "ลงนามแล้ว"}
              </div>
              <div style="font-size: 9px; color: #64748b; margin-top: 4px;">
                วันที่: ${formatThaiDate(submission.filledAt)}
              </div>
            </td>
            <td style="padding: 10px 6px; border-right: 1px solid #0369a1; text-align: center; vertical-align: bottom; height: 50px;">
              <div style="font-size: 13px; font-weight: 700; color: #0284c7; font-family: cursive;">
                ${submission.values["footer_sign_reviewed"] || "ลงนามแล้ว"}
              </div>
              <div style="font-size: 9px; color: #64748b; margin-top: 4px;">
                วันที่: ${formatThaiDate(submission.filledAt)}
              </div>
            </td>
            <td style="padding: 10px 6px; text-align: center; vertical-align: bottom; height: 50px;">
              <div style="font-size: 13px; font-weight: 700; color: #0284c7; font-family: cursive;">
                ${submission.values["footer_sign_approved"] || "ลงนามแล้ว"}
              </div>
              <div style="font-size: 9px; color: #64748b; margin-top: 4px;">
                วันที่: ${formatThaiDate(submission.filledAt)}
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer Info -->
        <div style="border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9px; color: #64748b;">
          <div>เอกสารนี้เป็นกรรมสิทธิ์ของบริษัท ห้ามคัดลอก ทำซ้ำ หรือเผยแพร่โดยไม่ได้รับอนุญาตตาม ISO 9001: 7.5.3</div>
          <div style="color: #0369a1; font-weight: 600;">หน้า 1 / 1 | พิมพ์เมื่อ: ${new Date().toLocaleTimeString("th-TH")}</div>
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
    pdf.save(`${template.documentCode}_${safeTitle}_Form.pdf`);
  } finally {
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  }
}
