"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { downloadDocument } from "@/lib/documents/actions";
import { generateDocumentPdf } from "./generateDocumentPdf";
import { loadFormTemplate, loadSubmissions } from "./designer/designerStorage";
import { generateFormSubmissionPdf } from "./designer/generateFormPdf";
import type { FormSubmission } from "./designer/types";

/** Calls the download action and generates the PDF file directly in the browser. */
export function useDownload() {
  const { t } = useI18n();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  const download = (id: string) =>
    startTransition(async () => {
      const res = await downloadDocument(id);
      if (!res.ok) {
        const errText = t.errors[res.error];
        setMessage({ ok: false, text: errText });
        toast.error(errText);
        return;
      }

      try {
        const docCode = res.docMeta.code || "";
        const docTitle = res.docMeta.title || "";
        const isFormDoc =
          Boolean(res.docMeta.docTypeLabel?.includes("FORM")) ||
          Boolean(res.docMeta.docTypeLabel?.includes("แบบฟอร์ม")) ||
          docCode.startsWith("FM-") ||
          docCode.startsWith("FORM-");

        const submissions = loadSubmissions(id);
        const hasCustomTemplate =
          typeof window !== "undefined" &&
          Boolean(localStorage.getItem(`qe_document_form_templates_v1_${id}`));

        if (submissions.length > 0 || hasCustomTemplate || isFormDoc) {
          const template = loadFormTemplate(id, docCode, docTitle);
          const activeSubmission: FormSubmission =
            submissions.length > 0
              ? submissions[0]
              : {
                  id: `sub-${Date.now()}`,
                  templateId: template.id,
                  documentId: template.documentId,
                  documentCode: template.documentCode,
                  title: template.title,
                  values: {
                    "f-date-1": new Date().toISOString().split("T")[0],
                    footer_sign_prepared: res.docMeta.preparedBy !== "-" ? res.docMeta.preparedBy : "ฝ่ายประกันคุณภาพ",
                    footer_sign_reviewed: res.docMeta.reviewedBy !== "-" ? res.docMeta.reviewedBy : undefined,
                    footer_sign_approved: res.docMeta.approvedBy !== "-" ? res.docMeta.approvedBy : undefined,
                  },
                  status: "submitted",
                  filledBy: {
                    id: "system",
                    name: res.docMeta.preparedBy !== "-" ? res.docMeta.preparedBy : "ฝ่ายประกันคุณภาพ",
                    department: res.docMeta.department,
                  },
                  filledAt:
                    res.docMeta.effectiveDate && res.docMeta.effectiveDate !== "-"
                      ? res.docMeta.effectiveDate
                      : new Date().toISOString(),
                };

          await generateFormSubmissionPdf({
            template,
            submission: activeSubmission,
            isControlled: true,
            fileName: res.fileName,
          });
        } else {
          await generateDocumentPdf(res.docMeta, res.fileName);
        }
      } catch (err) {
        console.error("PDF generation failed:", err);
        // Fallback to text file if client PDF generation encounters an issue
        const blob = new Blob(["\uFEFF", res.content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.fileName.replace(/\.pdf$/, ".txt");
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      const okText = t.documents.downloaded.replace("{file}", res.fileName);
      setMessage({ ok: true, text: okText });
      toast.success(okText);
    });

  return { download, pending, message, clearMessage: () => setMessage(undefined) };
}
