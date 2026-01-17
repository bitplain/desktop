import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createCsrfToken } from "@/lib/csrf";

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
  const token = await getToken({ req: request });
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/setup");
  const withCsrfCookie = (response: NextResponse) => {
    if (request.cookies.get("csrf-token")) {
      return response;
    }
    const tokenValue = createCsrfToken();
    response.cookies.set("csrf-token", tokenValue, {
      httpOnly: false,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
    });
    return response;
  };

  if (!token && !isAuthRoute) {
    return withCsrfCookie(NextResponse.redirect(new URL("/login", request.url)));
  }
  return withCsrfCookie(NextResponse.next());
}
