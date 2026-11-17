import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!filename || filename.includes("..")) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "videos", filename);

  try {
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".ogg": "video/ogg",
      ".mov": "video/quicktime",
      ".m4v": "video/x-m4v",
    };
    const contentType = contentTypeMap[ext] || "video/mp4";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const fileStream = createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunksize),
          "Content-Type": contentType,
        },
      });
    }

    const fileStream = createReadStream(filePath);
    const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Content-Type": contentType,
      },
    });
  } catch {
    return new NextResponse("Video not found", { status: 404 });
  }
}
