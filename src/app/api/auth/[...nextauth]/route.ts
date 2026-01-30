import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

type RouteContext = { params: Promise<{ nextauth: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return NextAuth(getAuthOptions(request))(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return NextAuth(getAuthOptions(request))(request, context);
}
