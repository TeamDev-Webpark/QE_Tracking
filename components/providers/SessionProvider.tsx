"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@/lib/types";

const SessionContext = createContext<User | null>(null);

export function SessionProvider({ user, children }: { user: User; children: ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/** The logged-in user. Only usable inside the (main) layout. */
export function useSessionUser() {
  const user = useContext(SessionContext);
  if (!user) throw new Error("useSessionUser must be used inside <SessionProvider>");
  return user;
}
