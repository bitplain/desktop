import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body?.email || "").toLowerCase().trim();
  const password = String(body?.password || "");
  if (!email || password.length < 6) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const count = await prisma.user.count();
  if (count > 0) {
    return NextResponse.json({ error: "Admin already exists" }, { status: 409 });
  }
  const passwordHash = await hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash, role: "ADMIN" },
  });
  return NextResponse.json({ ok: true });
}
