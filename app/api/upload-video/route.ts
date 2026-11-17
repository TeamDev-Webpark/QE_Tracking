import { promises as fs, createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALLOWED_EXTS = [".mp4", ".webm", ".ogg", ".mov", ".m4v"];

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "qe")) {
    return NextResponse.json({ ok: false, error: "ไม่มีสิทธิ์อัปโหลดวิดีโอ (ต้องเป็น Admin หรือ QE)" }, { status: 403 });
  }

  const uploadDir = path.join(process.cwd(), "public", "videos");
  await fs.mkdir(uploadDir, { recursive: true });

  const contentType = req.headers.get("content-type") || "";

  // 1. Direct Binary Stream Upload (Supports large files of 40MB, 100MB, 500MB+ without FormData limits!)
  if (!contentType.includes("multipart/form-data") && req.body) {
    try {
      const url = new URL(req.url);
      const rawHeaderName = req.headers.get("x-filename");
      const rawQueryName = url.searchParams.get("name");
      const origName = decodeURIComponent(rawHeaderName || rawQueryName || "lesson.mp4");

      const ext = path.extname(origName).toLowerCase() || ".mp4";
      if (!ALLOWED_EXTS.includes(ext)) {
        return NextResponse.json(
          { ok: false, error: "รองรับเฉพาะไฟล์วิดีโอนามสกุล .mp4, .webm, .ogg, .mov, .m4v" },
          { status: 400 },
        );
      }

      const rawBase = path.basename(origName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanBase = rawBase.replace(/_+/g, "_").slice(0, 30);
      const fileName = `${Date.now()}_${cleanBase || "lesson"}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      // Stream directly to disk with zero-memory bloat
      const nodeStream = Readable.fromWeb(req.body as import("node:stream/web").ReadableStream);
      const fileStream = createWriteStream(filePath);
      await pipeline(nodeStream, fileStream);

      const stat = await fs.stat(filePath);

      return NextResponse.json({
        ok: true,
        url: `/videos/${fileName}`,
        fileName: origName,
        fileSize: stat.size,
      });
    } catch (err) {
      console.error("Direct stream upload error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกไฟล์วิดีโอ";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  // 2. Fallback Multipart Form-Data Parser
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "ไม่พบไฟล์วิดีโอ กรุณาเลือกไฟล์ใหม่อีกครั้ง" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase() || ".mp4";
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: "รองรับเฉพาะไฟล์วิดีโอนามสกุล .mp4, .webm, .ogg, .mov, .m4v" },
        { status: 400 },
      );
    }

    const rawBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanBase = rawBase.replace(/_+/g, "_").slice(0, 30);
    const fileName = `${Date.now()}_${cleanBase || "lesson"}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      ok: true,
      url: `/videos/${fileName}`,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err) {
    console.error("Upload video route error:", err);
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกไฟล์วิดีโอบนเซิร์ฟเวอร์";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
