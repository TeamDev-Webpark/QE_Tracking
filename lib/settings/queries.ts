import { connection } from "next/server";
import { readDb } from "@/lib/db";

export async function getSettingsPageData() {
  await connection();
  const db = await readDb();
  return {
    users: db.users,
    settings: db.settings,
  };
}
