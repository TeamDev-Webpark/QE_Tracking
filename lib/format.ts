import { departments } from "@/data/departments";
import type { Lang } from "@/i18n/dictionaries";

/** Fixed time zone so server and browser render the same text. */
const TIME_ZONE = "Asia/Bangkok";

/** e.g. "6 พ.ย. 2569 14:30" (th) / "6 Nov 2026, 14:30" (en). */
export function formatDateTime(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** e.g. "6 พ.ย. 2569" (th) / "6 Nov 2026" (en). Safe for YYYY-MM-DD and ISO timestamps. */
export function formatDate(isoOrYmd: string, lang: Lang) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd) ? `${isoOrYmd}T12:00:00Z` : isoOrYmd;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return isoOrYmd;
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
    timeZone: TIME_ZONE,
  }).format(d);
}

export function departmentName(id: string, lang: Lang) {
  const d = departments.find((d) => d.id === id);
  if (!d) return id;
  return lang === "en" ? d.nameEn : d.name;
}

/** Value for <input type="datetime-local"> in the browser's local time. */
export function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
