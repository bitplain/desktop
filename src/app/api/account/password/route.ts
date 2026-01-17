import { hash, compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { validatePassword } from "@/lib/validation";
import { consumeRateLimit } from "@/lib/rateLimit";
import { getRequestIp } from "@/lib/requestIp";

export async function POST(request: Request) {
  const prisma = getPrisma();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ip = getRequestIp(request.headers);
  const rateLimitKey = `password|${ip}|${session.user.id}`;
  const rateLimit = await consumeRateLimit(rateLimitKey, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Слишком много попыток. Повторите позже." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const currentPassword = String(body?.currentPassword || "");
    const passwordCheck = validatePassword(String(body?.newPassword ?? ""));

    if (!currentPassword || !passwordCheck.ok) {
      return NextResponse.json(
        { error: "Invalid current or new password." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Неверный текущий пароль." }, { status: 400 });
    }

    const passwordHash = await hash(passwordCheck.value, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const isDbUnavailable =
      error instanceof Error &&
      error.message.includes("Can't reach database server");

    return NextResponse.json(
      {
        error: isDbUnavailable
          ? "Database is unavailable. Start Postgres and try again."
          : "Password update failed.",
      },
      { status: isDbUnavailable ? 503 : 500 }
    );
  }
}
