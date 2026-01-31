import { getPrisma } from "@/lib/db";
import { ensureUserVideoRoot } from "@/lib/filemanager/service";
import { normalizeRelativePath } from "@/lib/filemanager/paths";
import { decryptSecret } from "@/lib/storage/crypto";
import { createLocalProvider } from "@/lib/storage/localProvider";
import { createSmbProvider } from "@/lib/storage/smbProvider";
import { buildFtpPath, createFtpProvider } from "@/lib/storage/ftpProvider";
import type { StorageProvider } from "@/lib/storage/types";
import { buildRemotePath, normalizeStorageSubPath } from "@/lib/storage/paths";
import { selectActiveConnection } from "@/lib/storage/connection";

export function getDataDir() {
  return process.env.DATA_DIR?.trim() || "/data";
}

type StorageContext = {
  provider: StorageProvider;
  mapPath: (path: string) => string;
  source: "local" | "smb" | "ftp";
};

export async function getStorageContext({
  dataDir,
  userId,
}: {
  dataDir: string;
  userId: string;
}): Promise<StorageContext> {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      provider: createLocalProvider({ dataDir, userId }),
      mapPath: (path) => path,
      source: "local",
    };
  }
  const prisma = getPrisma();
  const [user, connections] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeStorageProvider: true },
    }),
    prisma.storageConnection.findMany({ where: { userId } }),
  ]);
  const connection = selectActiveConnection(
    (user?.activeStorageProvider as "SMB" | "FTP" | null) ?? null,
    connections
  );
  if (!connection) {
    return {
      provider: createLocalProvider({ dataDir, userId }),
      mapPath: (path) => path,
      source: "local",
    };
  }
  const secret = process.env.KEYS_ENCRYPTION_SECRET?.trim();
  if (!secret) {
    throw new Error("KEYS_ENCRYPTION_SECRET is required");
  }
  const password = decryptSecret(connection.passwordEncrypted, secret);
  const subPath = normalizeStorageSubPath(connection.subPath ?? "");
  if (connection.provider === "FTP") {
    const provider = createFtpProvider({
      host: connection.host,
      port: connection.port ?? 21,
      username: connection.username,
      password,
    });
    return {
      provider,
      mapPath: (path) => buildFtpPath(path, subPath),
      source: "ftp",
    };
  }
  const provider = createSmbProvider({
    host: connection.host,
    share: connection.share,
    username: connection.username,
    password,
  });
  return {
    provider,
    mapPath: (path) => buildRemotePath(path, subPath),
    source: "smb",
  };
}

export async function listHandler({
  dataDir,
  userId,
  path,
}: {
  dataDir: string;
  userId: string;
  path: string;
}) {
  const context = await getStorageContext({ dataDir, userId });
  return context.provider.list(context.mapPath(path));
}

export async function createFolderHandler({
  dataDir,
  userId,
  parentPath,
  name,
}: {
  dataDir: string;
  userId: string;
  parentPath: string;
  name: string;
}) {
  const context = await getStorageContext({ dataDir, userId });
  const fullPath = [parentPath, name].filter(Boolean).join("/");
  await context.provider.createFolder(context.mapPath(fullPath));
  return { ok: true };
}

export async function deleteFolderHandler({
  dataDir,
  userId,
  path,
}: {
  dataDir: string;
  userId: string;
  path: string;
}) {
  const context = await getStorageContext({ dataDir, userId });
  await context.provider.deleteFolder(context.mapPath(path));
  return { ok: true };
}

export async function deleteFileHandler({
  dataDir,
  userId,
  path,
}: {
  dataDir: string;
  userId: string;
  path: string;
}) {
  const context = await getStorageContext({ dataDir, userId });
  await context.provider.deleteFile(context.mapPath(path));
  return { ok: true };
}

export async function listFavoritesHandler({ userId }: { userId: string }) {
  const prisma = getPrisma();
  const favorites = await prisma.videoFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return favorites.map((fav: { relativePath: string }) => fav.relativePath);
}

export async function addFavoriteHandler({
  userId,
  path,
}: {
  userId: string;
  path: string;
}) {
  const prisma = getPrisma();
  const normalized = normalizeRelativePath(path);
  if (!normalized || !normalized.startsWith("video/")) {
    throw new Error("Invalid path");
  }
  await prisma.videoFavorite.upsert({
    where: { userId_relativePath: { userId, relativePath: normalized } },
    update: {},
    create: { userId, relativePath: normalized },
  });
  return { ok: true };
}

export async function removeFavoriteHandler({
  userId,
  path,
}: {
  userId: string;
  path: string;
}) {
  const prisma = getPrisma();
  const normalized = normalizeRelativePath(path);
  if (!normalized || !normalized.startsWith("video/")) {
    throw new Error("Invalid path");
  }
  await prisma.videoFavorite.deleteMany({
    where: { userId, relativePath: normalized },
  });
  return { ok: true };
}

export async function ensureVideoRoot({ dataDir, userId }: { dataDir: string; userId: string }) {
  const context = await getStorageContext({ dataDir, userId });
  if (context.source === "local") {
    await ensureUserVideoRoot(dataDir, userId);
    return;
  }
  const target = context.mapPath("video");
  if (target) {
    await context.provider.createFolder(target);
  }
}
