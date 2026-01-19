import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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
  if (!process.env.NEXTAUTH_SECRET) {
    return NextResponse.next();
  }
  const token = await getToken({ req: request });
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/setup");
  if (!token && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}
