import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSetupStatus } from "@/lib/setupStatus";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  const status = await getSetupStatus();
  if (status === "needsSetup" && !pathname.startsWith("/setup")) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }
  if (status === "needsAdmin" && !pathname.startsWith("/setup/admin")) {
    return NextResponse.redirect(new URL("/setup/admin", request.url));
  }
  const token = await getToken({ req: request });
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");
  if (!token && !isAuthRoute && !pathname.startsWith("/setup")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}
