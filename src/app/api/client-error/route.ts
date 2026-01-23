import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  console.error("[client-error]", payload);
  return NextResponse.json({ ok: true });
}
