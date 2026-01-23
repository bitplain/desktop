import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getPrisma } from "@/lib/db";
import { validateEmail, validatePassword } from "@/lib/validation";

export async function POST(request: Request) {
  const prisma = getPrisma();
  const body = await request.json();
  console.log("[setup-admin] request", {
    method: request.method,
    url: request.url,
    headers: {
      "user-agent": request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      origin: request.headers.get("origin"),
    },
    body: {
      email: body?.email,
      password: body?.password ? "[redacted]" : undefined,
    },
  });
  const emailCheck = validateEmail(String(body?.email ?? ""));
  const passwordCheck = validatePassword(String(body?.password ?? ""));
  if (!emailCheck.ok || !passwordCheck.ok) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const count = await prisma.user.count();
  if (count > 0) {
    return NextResponse.json({ error: "Admin already exists" }, { status: 409 });
  }
  const passwordHash = await hash(passwordCheck.value, 12);
  await prisma.user.create({
    data: { email: emailCheck.value, passwordHash, role: "ADMIN" },
  });
  return NextResponse.json({ ok: true });
}
