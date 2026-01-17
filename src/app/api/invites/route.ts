import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hashInviteCode } from "@/lib/inviteCodes";
import { consumeRateLimit } from "@/lib/rateLimit";
import { getRequestIp } from "@/lib/requestIp";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ip = getRequestIp(request.headers);
  const rateLimitKey = `invites|${ip}|${session.user.id}`;
  const rateLimit = await consumeRateLimit(rateLimitKey, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Повторите позже." },
      { status: 429 }
    );
  }
  const prisma = getPrisma();
  const raw = `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const codeHash = await hashInviteCode(raw);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await prisma.invite.create({
    data: { codeHash, createdBy: session.user.id, expiresAt },
  });
  return NextResponse.json({ code: raw, expiresAt });
}
