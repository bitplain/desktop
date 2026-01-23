import { getPrisma } from "@/lib/db";
import {
  createFolder,
  deleteFile,
  deleteFolder,
  ensureUserVideoRoot,
  listEntries,
} from "@/lib/filemanager/service";
import { normalizeRelativePath } from "@/lib/filemanager/paths";

export function getDataDir() {
  return process.env.DATA_DIR?.trim() || "/data";
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
  return listEntries(dataDir, userId, path);
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
  await createFolder(dataDir, userId, parentPath, name);
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
  await deleteFolder(dataDir, userId, path);
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
  await deleteFile(dataDir, userId, path);
  return { ok: true };
}

export async function listFavoritesHandler({ userId }: { userId: string }) {
  const prisma = getPrisma();
  const favorites = await prisma.videoFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return favorites.map((fav) => fav.relativePath);
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
  await ensureUserVideoRoot(dataDir, userId);
}
