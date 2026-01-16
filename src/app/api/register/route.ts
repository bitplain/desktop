import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyInviteCode } from "@/lib/inviteCodes";
import { validateEmail, validatePassword } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const emailCheck = validateEmail(String(body?.email ?? ""));
  const passwordCheck = validatePassword(String(body?.password ?? ""));
  const inviteCode = String(body?.inviteCode || "").trim();
  if (!emailCheck.ok || !passwordCheck.ok || !inviteCode) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
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
  await prisma.$transaction(async (tx) => {
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
