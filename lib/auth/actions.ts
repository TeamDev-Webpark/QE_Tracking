"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCredentials } from "@/data";
import { auditEntry } from "@/lib/audit";
import { updateDb } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./constants";
import { getSessionUser } from "./session";

export type LoginState = { error?: "required" | "invalid"; username?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!username.trim() || !password) return { error: "required", username };

  const user = verifyCredentials(username, password);
  if (!user) return { error: "invalid", username };

  (await cookies()).set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  await updateDb((db) => {
    db.auditLog.push(auditEntry(user, "login", { type: "auth", id: user.id, label: user.nameEn }));
  });
  redirect("/");
}

export async function logout() {
  const user = await getSessionUser();
  (await cookies()).delete(SESSION_COOKIE);
  if (user) {
    await updateDb((db) => {
      db.auditLog.push(auditEntry(user, "logout", { type: "auth", id: user.id, label: user.nameEn }));
    });
  }
  redirect("/login");
}
