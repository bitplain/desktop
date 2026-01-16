import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body?.email || "").toLowerCase().trim();
  const password = String(body?.password || "");
  const inviteCode = String(body?.inviteCode || "").trim();
  if (!email || password.length < 6 || !inviteCode) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  // TODO: validate invite code + expiration + consume.
  const passwordHash = await hash(password, 10);
  await prisma.user.create({ data: { email, passwordHash, role: "USER" } });
  return NextResponse.json({ ok: true });
}
