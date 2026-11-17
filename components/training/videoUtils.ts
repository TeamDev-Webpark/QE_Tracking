/**
 * Video URL Parser & Resolver for QE E-Learning
 * Supports:
 * - YouTube (standard watch, shorts, live, embed, youtu.be, and iframe embed tags)
 * - Google Drive (shared file preview)
 * - Vimeo
 * - Direct video files (.mp4, .webm, .ogg, .mov, /videos/..., /api/videos/..., blob:, data:)
 */

export type VideoSourceType = "youtube" | "googledrive" | "vimeo" | "direct" | "unknown";

export type ParsedVideoSource = {
  type: VideoSourceType;
  embedUrl?: string;     // For <iframe> playback
  directUrl?: string;    // For HTML5 <video> playback
  originalUrl: string;
  providerLabel: string;
  startTimeSec?: number;
};

/** Parse start time parameter like ?t=90, ?t=1m30s, &start=90 */
function parseStartTime(timeParam: string | null): number | undefined {
  if (!timeParam) return undefined;
  const num = Number(timeParam);
  if (!Number.isNaN(num) && num > 0) return num;

  // e.g. 1h2m30s, 2m15s, 45s
  let totalSec = 0;
  const hMatch = timeParam.match(/(\d+)h/i);
  const mMatch = timeParam.match(/(\d+)m/i);
  const sMatch = timeParam.match(/(\d+)s/i);
  if (hMatch) totalSec += Number(hMatch[1]) * 3600;
  if (mMatch) totalSec += Number(mMatch[1]) * 60;
  if (sMatch) totalSec += Number(sMatch[1]);
  return totalSec > 0 ? totalSec : undefined;
}

export function parseVideoSource(rawInput?: string | null): ParsedVideoSource | null {
  if (!rawInput) return null;
  let raw = rawInput.trim();
  if (!raw) return null;

  // 1. Check if user pasted an entire <iframe> embed code snippet
  const iframeMatch = raw.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i);
  if (iframeMatch) {
    raw = iframeMatch[1].trim();
  }

  // 2. YouTube Parsing:
  // Examples:
  // - https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // - https://youtu.be/dQw4w9WgXcQ
  // - https://www.youtube.com/shorts/dQw4w9WgXcQ
  // - https://youtube.com/live/dQw4w9WgXcQ
  // - https://www.youtube.com/embed/dQw4w9WgXcQ
  // - https://m.youtube.com/watch?v=dQw4w9WgXcQ
  if (raw.includes("youtube.com") || raw.includes("youtu.be")) {
    let videoId: string | null = null;
    let startSec: number | undefined;

    try {
      const urlObj = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      startSec = parseStartTime(urlObj.searchParams.get("t") || urlObj.searchParams.get("start"));

      if (urlObj.hostname.includes("youtu.be")) {
        const pathSegments = urlObj.pathname.split("/").filter(Boolean);
        // youtu.be/ID or youtu.be/shorts/ID
        videoId = pathSegments[pathSegments.length - 1] ?? null;
      } else {
        if (urlObj.pathname.startsWith("/embed/")) {
          videoId = urlObj.pathname.replace("/embed/", "").split("/")[0] ?? null;
        } else if (urlObj.pathname.startsWith("/shorts/")) {
          videoId = urlObj.pathname.replace("/shorts/", "").split("/")[0] ?? null;
        } else if (urlObj.pathname.startsWith("/live/")) {
          videoId = urlObj.pathname.replace("/live/", "").split("/")[0] ?? null;
        } else {
          videoId = urlObj.searchParams.get("v");
        }
      }
    } catch {
      // Fallback regex if URL parsing threw
      const match = raw.match(
        /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
      );
      if (match) videoId = match[1];
    }

    if (videoId && videoId.length >= 11) {
      const cleanId = videoId.slice(0, 11);
      const params = new URLSearchParams({
        autoplay: "0",
        rel: "0",
        controls: "0", // Hide native YouTube timeline & controls inside the video frame
        modestbranding: "1",
        enablejsapi: "1",
        disablekb: "1",
        fs: "0",
        iv_load_policy: "3",
      });
      if (startSec) params.set("start", String(startSec));

      return {
        type: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${cleanId}?${params.toString()}`,
        originalUrl: rawInput,
        providerLabel: "YouTube",
        startTimeSec: startSec,
      };
    }
  }

  // 3. Google Drive Video Parsing
  // Examples:
  // - https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing
  // - https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
  // - https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview
  if (raw.includes("drive.google.com")) {
    const gdMatch = raw.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i);
    if (gdMatch && gdMatch[1]) {
      const fileId = gdMatch[1];
      return {
        type: "googledrive",
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        originalUrl: rawInput,
        providerLabel: "Google Drive Video",
      };
    }
  }

  // 4. Vimeo Parsing
  // Example: https://vimeo.com/76979871
  if (raw.includes("vimeo.com")) {
    const vmMatch = raw.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^/]+\/videos\/|video\/|)(\d+)/i);
    if (vmMatch && vmMatch[1]) {
      return {
        type: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${vmMatch[1]}`,
        originalUrl: rawInput,
        providerLabel: "Vimeo",
      };
    }
  }

  // 5. Direct Video Files (Local files, Cloud Storage, or MP4/WebM URLs)
  // Check extension or known local paths
  const isDirectFile =
    raw.startsWith("/") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:video/") ||
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(raw);

  if (isDirectFile || raw.startsWith("http://") || raw.startsWith("https://")) {
    return {
      type: "direct",
      directUrl: raw,
      originalUrl: rawInput,
      providerLabel: "ไฟล์วิดีโอ (Direct Video / MP4)",
    };
  }

  return {
    type: "unknown",
    directUrl: raw,
    originalUrl: rawInput,
    providerLabel: "วิดีโอ",
  };
}
