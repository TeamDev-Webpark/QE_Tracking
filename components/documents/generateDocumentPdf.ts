import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { DocumentPdfMeta } from "@/lib/documents/actions";

/**
 * Format date string (e.g. "2026-01-15") into formal Thai government/official date format.
 * e.g. "15 มกราคม 2569"
 */
function formatThaiDate(dateStr: string): string {
  if (!dateStr || dateStr === "-") return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543; // Buddhist Era
  return `${day} ${month} ${year}`;
}

/**
 * Renders a formal, government/ISO standard controlled document layout
 * with official seal, header table, red official stamp, numbered clauses,
 * and signature boxes.
 */
export async function generateDocumentPdf(doc: DocumentPdfMeta, fileName: string): Promise<void> {
  const container = document.createElement("div");
  container.id = "pdf-render-target";
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px"; // Standard A4 width at 96 DPI
  container.style.minHeight = "1123px"; // Standard A4 height at 96 DPI
  container.style.padding = "36px 44px";
  container.style.boxSizing = "border-box";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#0f172a";
  container.style.fontFamily = "'Noto Serif Thai', 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', 'Angsana New', serif, sans-serif";
  container.style.fontSize = "13px";
  container.style.lineHeight = "1.55";
  container.style.zIndex = "-1000";

  const revNum = `Rev. ${String(doc.version).padStart(2, "0")}`;
  const effectiveThai = formatThaiDate(doc.effectiveDate);
  const downloadedThai = formatThaiDate(doc.downloadedAt);
  const printedTime = new Date(doc.downloadedAt).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  container.innerHTML = `
    <!-- Outer Formal Document Border -->
    <div style="border: 2px solid #1e293b; padding: 22px 24px; min-height: 1040px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative;">

      <!-- Top Formal Header Block -->
      <div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #1e293b; margin-bottom: 14px;">
          <tr>
            <!-- Left: Official Emblem & Department Name -->
            <td style="width: 28%; vertical-align: middle; border-right: 1.5px solid #1e293b; padding: 12px 14px; text-align: center;">
              <!-- Official Quality Crest SVG -->
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none" style="margin: 0 auto 4px auto; display: block;">
                <circle cx="24" cy="24" r="22" stroke="#1e293b" stroke-width="2" fill="#f8fafc" />
                <circle cx="24" cy="24" r="18" stroke="#0369a1" stroke-width="1.2" stroke-dasharray="3 2" fill="none" />
                <path d="M24 8 L27 17 L36 17 L29 23 L32 32 L24 26 L16 32 L19 23 L12 17 L21 17 Z" fill="#0284c7" stroke="#0369a1" stroke-width="0.8" />
                <circle cx="24" cy="22" r="5" fill="#ffffff" stroke="#0284c7" stroke-width="1" />
              </svg>
              <div style="font-size: 11px; font-weight: 800; color: #0f172a; letter-spacing: 0.3px;">ระบบบริหารงานคุณภาพ</div>
              <div style="font-size: 9.5px; color: #475569; margin-top: 1px;">ศูนย์ควบคุมเอกสารและสารสนเทศ (DCC)</div>
              <div style="font-size: 9px; color: #64748b;">ตามมาตรฐานสากล ISO</div>
            </td>

            <!-- Center: Document Title & Procedure -->
            <td style="width: 44%; vertical-align: middle; text-align: center; padding: 12px 16px;">
              <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(doc.docTypeLabel)}</div>
              <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; line-height: 1.35; letter-spacing: -0.2px;">${escapeHtml(doc.title)}</div>
              <div style="font-size: 11px; font-weight: 600; color: #0284c7; margin-top: 3px;">มาตรฐานอ้างอิง: ${escapeHtml(doc.standard)}${doc.clause ? ` · ข้อ ${escapeHtml(doc.clause)}` : ""}</div>
            </td>

            <!-- Right: Document Control Grid -->
            <td style="width: 28%; vertical-align: top; border-left: 1.5px solid #1e293b; padding: 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr style="border-bottom: 1px solid #1e293b;">
                  <td style="padding: 5px 8px; color: #475569; font-weight: 600; border-right: 1px solid #e2e8f0; width: 48%;">รหัสเอกสาร</td>
                  <td style="padding: 5px 8px; font-weight: 800; color: #0f172a;">${escapeHtml(doc.code)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #1e293b;">
                  <td style="padding: 5px 8px; color: #475569; font-weight: 600; border-right: 1px solid #e2e8f0;">แก้ไขครั้งที่</td>
                  <td style="padding: 5px 8px; font-weight: 800; color: #0f172a;">${revNum}</td>
                </tr>
                <tr style="border-bottom: 1px solid #1e293b;">
                  <td style="padding: 5px 8px; color: #475569; font-weight: 600; border-right: 1px solid #e2e8f0;">วันบังคับใช้</td>
                  <td style="padding: 5px 8px; font-weight: 700; color: #0f172a; font-size: 10.5px;">${effectiveThai}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 8px; color: #475569; font-weight: 600; border-right: 1px solid #e2e8f0;">จำนวนหน้า</td>
                  <td style="padding: 5px 8px; font-weight: 700; color: #0f172a;">๑ / ๑</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Formal Sub-Header & Red Official Stamp -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px;">
          <!-- Left: General Summary Block -->
          <div style="flex: 1; border: 1px solid #cbd5e1; background: #fafafa; padding: 10px 14px; border-radius: 4px; font-size: 11.5px;">
            <div style="display: flex; margin-bottom: 4px;">
              <span style="width: 140px; color: #475569; font-weight: 700;">หน่วยงานผู้รับผิดชอบ:</span>
              <span style="font-weight: 800; color: #0f172a;">${escapeHtml(doc.department)}</span>
            </div>
            <div style="display: flex; margin-bottom: 4px;">
              <span style="width: 140px; color: #475569; font-weight: 700;">ผู้ครอบครองเอกสาร:</span>
              <span style="color: #0f172a;">${escapeHtml(doc.owner)}</span>
            </div>
            <div style="display: flex;">
              <span style="width: 140px; color: #475569; font-weight: 700;">บันทึกการแก้ไขในฉบับนี้:</span>
              <span style="color: #0f172a;">${escapeHtml(doc.changeNote)}</span>
            </div>
          </div>

          <!-- Right: Official Red Rubber Stamp (ตรายางราชการ / DCC Stamp) -->
          <div style="width: 210px; border: 2.5px double #b91c1c; background: #fef2f2; padding: 6px 10px; text-align: center; border-radius: 5px; transform: rotate(-2deg); box-shadow: 1px 2px 4px rgba(185, 28, 28, 0.15);">
            <div style="font-size: 11.5px; font-weight: 900; color: #991b1b; letter-spacing: 0.8px;">★ สำเนาควบคุม ★</div>
            <div style="font-size: 9.5px; font-weight: 800; color: #b91c1c; margin-top: 2px;">CONTROLLED COPY</div>
            <div style="font-size: 8.5px; color: #7f1d1d; border-top: 1px dashed #f87171; margin-top: 4px; padding-top: 3px;">
              ศูนย์ควบคุมเอกสาร (DCC) · ห้ามทำซ้ำ
            </div>
          </div>
        </div>

        <!-- Section 1: Purpose & Scope -->
        <div style="margin-bottom: 14px;">
          <div style="font-size: 13px; font-weight: 900; color: #0f172a; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 8px;">
            ข้อ ๑. วัตถุประสงค์และขอบเขต (Purpose & Scope)
          </div>
          <div style="padding-left: 12px; font-size: 12.5px; color: #1e293b; text-align: justify; line-height: 1.6;">
            เอกสารนี้จัดทำขึ้นเพื่อให้การดำเนินงานในกระบวนการ <strong>${escapeHtml(doc.title)}</strong> เป็นไปตามข้อกำหนดมาตรฐานสากล <strong>${escapeHtml(doc.standard)}</strong> อย่างถูกต้อง มีประสิทธิภาพ และสามารถตรวจสอบย้อนกลับได้ โดยครอบคลุมบุคลากรและหน่วยงานในสังกัด <strong>${escapeHtml(doc.department)}</strong> ตลอดจนผู้มีส่วนเกี่ยวข้องทุกฝ่าย
          </div>
        </div>

        <!-- Section 2: Procedure Content -->
        <div style="margin-bottom: 14px;">
          <div style="font-size: 13px; font-weight: 900; color: #0f172a; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 8px;">
            ข้อ ๒. ขั้นตอนและแนวทางปฏิบัติงาน (Operational Procedures)
          </div>
          <div style="background: #ffffff; border: 1px solid #cbd5e1; padding: 14px 16px; border-radius: 4px; font-size: 12.5px; color: #0f172a; line-height: 1.7; min-height: 190px; white-space: pre-wrap; text-align: justify;">${escapeHtml(doc.description)}</div>
        </div>

        <!-- Section 3: Normative & Control Regulations -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; font-weight: 900; color: #0f172a; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 8px;">
            ข้อ ๓. ข้อกำหนดการควบคุมและเกณฑ์การปฏิบัติ (Compliance & Control Rules)
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #cbd5e1;">
            <tr style="background: #f1f5f9; font-weight: 800; border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 6px 10px; width: 35%; border-right: 1px solid #cbd5e1;">หัวข้อข้อกำหนด</td>
              <td style="padding: 6px 10px;">เกณฑ์การควบคุมตามระบบบริหารคุณภาพ</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px 10px; font-weight: 700; border-right: 1px solid #cbd5e1; color: #334155;">การมีผลบังคับใช้</td>
              <td style="padding: 6px 10px; color: #0f172a;">มีผลบังคับใช้อย่างเป็นทางการตั้งแต่วันที่ ${effectiveThai} เป็นต้นไป</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px 10px; font-weight: 700; border-right: 1px solid #cbd5e1; color: #334155;">การจัดเก็บและการทำลาย</td>
              <td style="padding: 6px 10px; color: #0f172a;">จัดเก็บรักษาข้อมูลในระบบควบคุมเอกสารไม่น้อยกว่าระยะเวลาที่กฎหมายหรือมาตรฐานกำหนด</td>
            </tr>
            <tr>
              <td style="padding: 6px 10px; font-weight: 700; border-right: 1px solid #cbd5e1; color: #334155;">การทบทวนเอกสาร</td>
              <td style="padding: 6px 10px; color: #0f172a;">ต้องได้รับการทบทวนความเหมาะสมอย่างน้อยปีละ ๑ ครั้ง หรือเมื่อมีการเปลี่ยนแปลงกระบวนการ</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Bottom Approval & Signatures Grid -->
      <div>
        <div style="margin-bottom: 14px;">
          <div style="font-size: 13px; font-weight: 900; color: #0f172a; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 8px;">
            ข้อ ๔. การรับรองและการลงนามอนุมัติ (Document Approval Matrix)
          </div>
          <table style="width: 100%; border: 1.5px solid #1e293b; border-collapse: collapse; text-align: center; font-size: 11px;">
            <tr style="background: #f8fafc; border-bottom: 1.5px solid #1e293b; font-weight: 800; color: #0f172a;">
              <td style="width: 33.33%; padding: 7px; border-right: 1px solid #1e293b;">ผู้จัดทำ (Prepared by)</td>
              <td style="width: 33.33%; padding: 7px; border-right: 1px solid #1e293b;">ผู้ตรวจสอบ (Reviewed by)</td>
              <td style="width: 33.33%; padding: 7px;">ผู้อนุมัติ (Approved by)</td>
            </tr>
            <tr>
              <!-- Column 1: Prepared by -->
              <td style="padding: 26px 8px 8px; border-right: 1px solid #1e293b; vertical-align: bottom;">
                <div style="border-bottom: 1px dashed #64748b; width: 75%; margin: 0 auto 5px;"></div>
                <div style="font-weight: 800; color: #0f172a; font-size: 11.5px;">( ${escapeHtml(doc.owner)} )</div>
                <div style="color: #475569; font-size: 10px; margin-top: 2px;">เจ้าของเอกสาร / ผู้จัดทำ</div>
                <div style="color: #64748b; font-size: 9.5px; margin-top: 1px;">วันที่: ${effectiveThai}</div>
              </td>

              <!-- Column 2: Reviewed by -->
              <td style="padding: 26px 8px 8px; border-right: 1px solid #1e293b; vertical-align: bottom;">
                <div style="border-bottom: 1px dashed #64748b; width: 75%; margin: 0 auto 5px;"></div>
                <div style="font-weight: 800; color: #0f172a; font-size: 11.5px;">( เจ้าหน้าที่ควบคุมเอกสาร )</div>
                <div style="color: #475569; font-size: 10px; margin-top: 2px;">เจ้าหน้าที่ควบคุมเอกสาร (DCC)</div>
                <div style="color: #64748b; font-size: 9.5px; margin-top: 1px;">วันที่: ${effectiveThai}</div>
              </td>

              <!-- Column 3: Approved by -->
              <td style="padding: 26px 8px 8px; vertical-align: bottom;">
                <div style="border-bottom: 1px dashed #64748b; width: 75%; margin: 0 auto 5px;"></div>
                <div style="font-weight: 800; color: #0f172a; font-size: 11.5px;">( ตัวแทนฝ่ายบริหารด้านคุณภาพ )</div>
                <div style="color: #475569; font-size: 10px; margin-top: 2px;">ผู้จัดการฝ่ายประกันคุณภาพ (QMR)</div>
                <div style="color: #64748b; font-size: 9.5px; margin-top: 1px;">วันที่: ${effectiveThai}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Official Footer / Document Security Notice -->
        <div style="border-top: 1.5px solid #1e293b; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #475569;">
          <div>
            <strong>สำเนาอิเล็กทรอนิกส์:</strong> ดาวน์โหลดโดย ${escapeHtml(doc.downloadedBy)} | วันที่พิมพ์: ${downloadedThai} (${printedTime} น.)
          </div>
          <div style="font-weight: 700; color: #0f172a;">
            ISO TRACKING SYSTEM · QUALITY DOCUMENTATION
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

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = 210; // A4 width mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Render high quality page
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

    // Save PDF
    pdf.save(fileName);
  } finally {
    container.remove();
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
