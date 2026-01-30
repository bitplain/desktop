import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function resolveRequestProto(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-proto") ??
    request.headers.get("x-forwarded-protocol") ??
    request.nextUrl?.protocol?.replace(":", "") ??
    "http"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/wallpapers") ||
    pathname.startsWith("/sounds") ||
    pathname.startsWith("/cursors") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    return NextResponse.next();
  }
  const proto = resolveRequestProto(request);
  const token = await getToken({ req: request, secret, secureCookie: proto === "https" });
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/setup");
  if (!token && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}
