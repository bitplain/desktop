import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getPrisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { verifyInviteCode } from "@/lib/inviteCodes";
import { validateEmail, validatePassword } from "@/lib/validation";
import { consumeRateLimit } from "@/lib/rateLimit";
import { getRequestIp } from "@/lib/requestIp";
import { getCookieValue, validateCsrf } from "@/lib/csrf";

export async function POST(request: Request) {
  const csrfCheck = validateCsrf(
    getCookieValue(request.headers.get("cookie"), "csrf-token"),
    request.headers.get("x-csrf-token")
  );
  if (!csrfCheck.ok) {
    return NextResponse.json({ error: csrfCheck.error }, { status: 403 });
  }
  const body = await request.json();
  const emailCheck = validateEmail(String(body?.email ?? ""));
  const passwordCheck = validatePassword(String(body?.password ?? ""));
  const inviteCode = String(body?.inviteCode || "").trim();
  if (!emailCheck.ok || !passwordCheck.ok || !inviteCode) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const ip = getRequestIp(request.headers);
  const rateLimitKey = `register|${ip}|${emailCheck.value}`;
  const rateLimit = await consumeRateLimit(rateLimitKey, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Повторите позже." },
      { status: 429 }
    );
  }
  const prisma = getPrisma();
  const now = new Date();
  const invites = await prisma.invite.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: now },
    },
  });
  let matchedInvite = null;
  for (const invite of invites) {
    if (await verifyInviteCode(inviteCode, invite.codeHash)) {
      matchedInvite = invite;
      break;
    }
  }
  if (!matchedInvite) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }
  const passwordHash = await hash(passwordCheck.value, 12);
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: { email: emailCheck.value, passwordHash, role: "USER" },
    });
    await tx.invite.update({
      where: { id: matchedInvite.id },
      data: { usedAt: now, usedBy: user.id },
    });
  });
  return NextResponse.json({ ok: true });
}
