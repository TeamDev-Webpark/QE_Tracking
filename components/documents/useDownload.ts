"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { downloadDocument } from "@/lib/documents/actions";
import { generateDocumentPdf } from "./generateDocumentPdf";

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
        await generateDocumentPdf(res.docMeta, res.fileName);
      } catch {
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
