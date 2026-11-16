import type { DemoAccount } from "@/lib/types";

/** Demo login accounts. Plain-text passwords are for Demo only. */
export const demoAccounts: DemoAccount[] = [
  { username: "qe", password: "qe123", userId: "u1" },
  { username: "iso", password: "iso123", userId: "u2" },
  { username: "employee", password: "employee123", userId: "u3" },
  { username: "admin", password: "admin123", userId: "u4" },
];
