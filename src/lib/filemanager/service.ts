import { mkdir, readdir, stat, unlink, rm } from "node:fs/promises";
import { join } from "node:path";
import { buildUserRoot, isReservedRootFolder, resolveUserPath } from "./paths";

const VIDEO_FOLDER = "video";

export async function ensureUserVideoRoot(dataDir: string, userId: string) {
  const root = buildUserRoot(dataDir, userId);
  await mkdir(join(root, VIDEO_FOLDER), { recursive: true });
  return root;
}

export async function listEntries(dataDir: string, userId: string, relativePath: string) {
  await ensureUserVideoRoot(dataDir, userId);
  const { target } = resolveUserPath(dataDir, userId, relativePath);
  const items = await readdir(target, { withFileTypes: true });
  const folders: { name: string; path: string; updatedAt: string }[] = [];
  const files: { name: string; path: string; size: number; updatedAt: string }[] = [];

  for (const item of items) {
    const itemPath = join(target, item.name);
    const info = await stat(itemPath);
    const entryPath = [relativePath, item.name].filter(Boolean).join("/");
    if (item.isDirectory()) {
      folders.push({
        name: item.name,
        path: entryPath,
        updatedAt: info.mtime.toISOString(),
      });
    } else {
      files.push({
        name: item.name,
        path: entryPath,
        size: info.size,
        updatedAt: info.mtime.toISOString(),
      });
    }
  }

  return { folders, files };
}

export async function createFolder(
  dataDir: string,
  userId: string,
  parentPath: string,
  name: string
) {
  await ensureUserVideoRoot(dataDir, userId);
  if (!parentPath && isReservedRootFolder(name)) {
    throw new Error("Reserved folder name");
  }
  const { target } = resolveUserPath(
    dataDir,
    userId,
    [parentPath, name].filter(Boolean).join("/")
  );
  await mkdir(target, { recursive: true });
}

export async function deleteFolder(dataDir: string, userId: string, path: string) {
  if (!path) {
    throw new Error("Path is required");
  }
  if (isReservedRootFolder(path.split("/")[0])) {
    throw new Error("Cannot delete reserved folder");
  }
  const { target } = resolveUserPath(dataDir, userId, path);
  await rm(target, { recursive: true, force: true });
}

export async function deleteFile(dataDir: string, userId: string, path: string) {
  const { target } = resolveUserPath(dataDir, userId, path);
  await unlink(target);
}
