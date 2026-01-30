import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { encryptSecret } from "@/lib/storage/crypto";
import { normalizeStorageSubPath } from "@/lib/storage/paths";
import { serializeStorageConnection } from "@/lib/storage/connection";

export async function GET() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const connection = await prisma.storageConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!connection) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    connected: true,
    connection: serializeStorageConnection(connection),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const host = String(body?.host ?? "").trim();
  const share = String(body?.share ?? "").trim();
  const username = String(body?.username ?? "").trim();
  const subPath = normalizeStorageSubPath(String(body?.subPath ?? ""));
  const password = String(body?.password ?? "");

  if (!host || !share || !username) {
    return NextResponse.json({ error: "Invalid connection data" }, { status: 400 });
  }

  const secret = process.env.KEYS_ENCRYPTION_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Encryption is not configured" }, { status: 500 });
  }

  const prisma = getPrisma();
  const existing = await prisma.storageConnection.findUnique({
    where: { userId: session.user.id },
  });

  let passwordEncrypted = existing?.passwordEncrypted ?? "";
  if (password.trim()) {
    passwordEncrypted = encryptSecret(password, secret);
  }

  if (!passwordEncrypted) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const record = await prisma.storageConnection.upsert({
    where: { userId: session.user.id },
    update: {
      provider: "SMB",
      host,
      share,
      subPath,
      username,
      passwordEncrypted,
    },
    create: {
      userId: session.user.id,
      provider: "SMB",
      host,
      share,
      subPath,
      username,
      passwordEncrypted,
    },
  });

  return NextResponse.json({
    connected: true,
    connection: serializeStorageConnection(record),
  });
}

export async function DELETE() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  await prisma.storageConnection.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
