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
  const userId = req.cookies.get(SESSION_COOKIE)?.value;
  const user = userId ? getUserById(userId) : undefined;

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
  matcher: ["/((?!_next|__nextjs|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
