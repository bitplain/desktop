import { createReadStream } from "node:fs";
import { mkdir, readdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  buildUserRoot,
  isReservedRootFolder,
  normalizeRelativePath,
  resolveUserPath,
} from "@/lib/filemanager/paths";
import type { StorageEntry, StorageProvider } from "@/lib/storage/types";

const VIDEO_FOLDER = "video";
const FOTO_FOLDER = "foto";

export async function ensureUserVideoRoot(dataDir: string, userId: string) {
  const root = buildUserRoot(dataDir, userId);
  await Promise.all([
    mkdir(join(root, VIDEO_FOLDER), { recursive: true }),
    mkdir(join(root, FOTO_FOLDER), { recursive: true }),
  ]);
  return root;
}

export async function listEntries(
  dataDir: string,
  userId: string,
  relativePath: string
) {
  await ensureUserVideoRoot(dataDir, userId);
  const { target } = resolveUserPath(dataDir, userId, relativePath);
  const items = await readdir(target, { withFileTypes: true });
  const folders: StorageEntry[] = [];
  const files: StorageEntry[] = [];

  for (const item of items) {
    const itemPath = join(target, item.name);
    const info = await stat(itemPath);
    const entryPath = [relativePath, item.name].filter(Boolean).join("/");
    if (item.isDirectory()) {
      folders.push({
        name: item.name,
        path: entryPath,
        updatedAt: info.mtime.toISOString(),
        type: "folder",
      });
    } else {
      files.push({
        name: item.name,
        path: entryPath,
        size: info.size,
        updatedAt: info.mtime.toISOString(),
        type: "file",
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

function splitFolderPath(path: string) {
  const normalized = normalizeRelativePath(path);
  const parts = normalized.split("/").filter(Boolean);
  const name = parts.pop() ?? "";
  const parentPath = parts.join("/");
  return { name, parentPath };
}

export function createLocalProvider(params: {
  dataDir: string;
  userId: string;
}): StorageProvider {
  return {
    list: async (path) => listEntries(params.dataDir, params.userId, path),
    stat: async (path) => {
      const { target } = resolveUserPath(params.dataDir, params.userId, path);
      const info = await stat(target);
      return { size: info.size };
    },
    createReadStream: (path, options) => {
      const { target } = resolveUserPath(params.dataDir, params.userId, path);
      return createReadStream(target, options);
    },
    writeFile: async (path, data) => {
      await ensureUserVideoRoot(params.dataDir, params.userId);
      const { target } = resolveUserPath(params.dataDir, params.userId, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, data);
    },
    createFolder: async (path) => {
      const { name, parentPath } = splitFolderPath(path);
      if (!name) {
        throw new Error("Path is required");
      }
      await createFolder(params.dataDir, params.userId, parentPath, name);
    },
    deleteFile: async (path) => {
      await deleteFile(params.dataDir, params.userId, path);
    },
    deleteFolder: async (path) => {
      await deleteFolder(params.dataDir, params.userId, path);
    },
  };
}
