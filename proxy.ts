import { NextResponse, type NextRequest } from "next/server";
import { canAccess } from "@/config/access";
import { getUserById } from "@/data";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Demo route guard:
 * - not logged in      → /login
 * - logged in on /login → /
 * - role not allowed   → /
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static media and video streaming without redirecting
  if (
    pathname.startsWith("/videos/") ||
    pathname.startsWith("/api/videos/") ||
    /\.(mp4|webm|ogg|mov|m4v|pdf|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const userId = req.cookies.get(SESSION_COOKIE)?.value;
  const user = userId ? getUserById(userId) : undefined;

  // API routes should never 307-redirect to HTML login
  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    return user ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }

  if (!user) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    if (userId) res.cookies.delete(SESSION_COOKIE); // stale/unknown id
    return res;
  }

  if (!canAccess(user.role, pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|__nextjs|favicon.ico|videos/|api/upload-video|api/videos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|ogg|mov|m4v|pdf)$).*)",
  ],
};
