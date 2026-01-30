import { NextResponse } from "next/server";
import { checkAdminConnection } from "@/lib/adminConnection";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = {
    host: String(body?.host ?? ""),
    port: String(body?.port ?? ""),
    user: String(body?.user ?? ""),
    password: String(body?.password ?? ""),
    ssl: Boolean(body?.ssl),
  };
  if (!input.host || !input.port || !input.user || !input.password) {
    return NextResponse.json({ error: "Missing admin connection fields" }, { status: 400 });
  }
  try {
    await checkAdminConnection(input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
