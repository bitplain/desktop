import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { encryptSecret } from "@/lib/storage/crypto";
import { normalizeStorageSubPath } from "@/lib/storage/paths";
import {
  serializeStorageConnection,
  type StorageConnectionRecord,
  type StorageProviderId,
} from "@/lib/storage/connection";

type ConnectionPayload = ReturnType<typeof serializeStorageConnection>;

type ConnectionsResponse = {
  activeProvider: StorageProviderId | null;
  smb: ConnectionPayload | null;
  ftp: ConnectionPayload | null;
};

function normalizeProvider(value: unknown): StorageProviderId | null {
  const provider = String(value ?? "").trim().toUpperCase();
  if (provider === "SMB" || provider === "FTP") {
    return provider as StorageProviderId;
  }
  return null;
}

async function buildConnectionsResponse(userId: string): Promise<ConnectionsResponse> {
  const prisma = getPrisma();
  const [user, connections] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeStorageProvider: true },
    }),
    prisma.storageConnection.findMany({ where: { userId } }),
  ]);

  const smb = connections.find((connection) => connection.provider === "SMB") as
    | StorageConnectionRecord
    | undefined;
  const ftp = connections.find((connection) => connection.provider === "FTP") as
    | StorageConnectionRecord
    | undefined;

  return {
    activeProvider: (user?.activeStorageProvider as StorageProviderId | null) ?? null,
    smb: smb ? serializeStorageConnection(smb) : null,
    ftp: ftp ? serializeStorageConnection(ftp) : null,
  };
}

export async function GET() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await buildConnectionsResponse(session.user.id);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const provider = normalizeProvider(body?.provider ?? "SMB");
  if (!provider) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const host = String(body?.host ?? "").trim();
  const username = String(body?.username ?? "").trim();
  const subPath = normalizeStorageSubPath(String(body?.subPath ?? ""));
  const share = provider === "SMB" ? String(body?.share ?? "").trim() : "";
  const password = String(body?.password ?? "");
  const portRaw = provider === "FTP" ? body?.port : null;
  let port: number | null = null;

  if (!host || !username || (provider === "SMB" && !share)) {
    return NextResponse.json({ error: "Invalid connection data" }, { status: 400 });
  }

  if (provider === "FTP") {
    const parsedPort = Number(portRaw ?? 21);
    port = parsedPort;
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      return NextResponse.json({ error: "Invalid FTP port" }, { status: 400 });
    }
  }

  const secret = process.env.KEYS_ENCRYPTION_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Encryption is not configured" }, { status: 500 });
  }

  const prisma = getPrisma();
  const existing = await prisma.storageConnection.findFirst({
    where: { userId: session.user.id, provider },
  });

  let passwordEncrypted = existing?.passwordEncrypted ?? "";
  if (password.trim()) {
    passwordEncrypted = encryptSecret(password, secret);
  }

  if (!passwordEncrypted) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  if (existing) {
    await prisma.storageConnection.update({
      where: { id: existing.id },
      data: {
        provider,
        host,
        share,
        subPath,
        username,
        passwordEncrypted,
        port: port ?? null,
      },
    });
  } else {
    await prisma.storageConnection.create({
      data: {
        userId: session.user.id,
        provider,
        host,
        share,
        subPath,
        username,
        passwordEncrypted,
        port: port ?? null,
      },
    });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeStorageProvider: provider },
  });

  const data = await buildConnectionsResponse(session.user.id);
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const provider = normalizeProvider(url.searchParams.get("provider"));
  if (!provider) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const prisma = getPrisma();
  await prisma.storageConnection.deleteMany({
    where: { userId: session.user.id, provider },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeStorageProvider: true },
  });

  if (user?.activeStorageProvider === provider) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeStorageProvider: null },
    });
  }

  const data = await buildConnectionsResponse(session.user.id);
  return NextResponse.json(data);
}
