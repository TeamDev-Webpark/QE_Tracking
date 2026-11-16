import { cookies } from "next/headers";
import { getUserById } from "@/data";
import type { Lang } from "@/i18n/dictionaries";
import { SESSION_COOKIE } from "./constants";

/** Server-only: the logged-in user, or undefined. Must run inside <Suspense>. */
export async function getSessionUser() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return id ? getUserById(id) : undefined;
}

/** Server-only: UI language (always "th"). */
export async function getLang(): Promise<Lang> {
  return "th";
}
