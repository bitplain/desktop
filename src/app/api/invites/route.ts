import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hashInviteCode } from "@/lib/inviteCodes";

export async function POST() {
  const prisma = getPrisma();
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const codeHash = await hashInviteCode(raw);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await prisma.invite.create({
    data: { codeHash, createdBy: session.user.id, expiresAt },
  });
  return NextResponse.json({ code: raw, expiresAt });
}
