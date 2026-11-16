import type { Lang } from "@/i18n/dictionaries";
import type { User } from "./types";

/** User name in the current UI language. */
export function displayName(user: User, lang: Lang) {
  return lang === "en" ? user.nameEn : user.name;
}
