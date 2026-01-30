import SMB2 from "smb2";
import { PassThrough } from "node:stream";
import { buildSmbSharePath, toSmbPath } from "@/lib/storage/connection";
import type { StorageEntry, StorageProvider } from "@/lib/storage/types";

const DEFAULT_DOMAIN = "";
const DEFAULT_TIMEOUT = 10000;

type SmbClient = {
  readdir: (path: string, cb: (err: unknown, files?: string[]) => void) => void;
  readFile: (path: string, cb: (err: unknown, data?: Buffer) => void) => void;
  writeFile: (path: string, data: Buffer, cb: (err?: unknown) => void) => void;
  mkdir: (path: string, cb: (err?: unknown) => void) => void;
  rmdir: (path: string, cb: (err?: unknown) => void) => void;
  unlink: (path: string, cb: (err?: unknown) => void) => void;
};

function joinPath(...parts: string[]) {
  return parts.filter(Boolean).join("/");
}

function withSmbPath(basePath: string, path: string) {
  return toSmbPath(joinPath(basePath, path));
}

function smbCall<T>(
  client: SmbClient,
  method: keyof SmbClient,
  ...args: unknown[]
): Promise<T> {
  return new Promise((resolve, reject) => {
    const callback = (err: unknown, result?: T) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result as T);
    };
    (client[method] as (...params: unknown[]) => void)(...args, callback);
  });
}

async function safeMkdir(client: SmbClient, path: string) {
  try {
    await smbCall<void>(client, "mkdir", path);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "STATUS_OBJECT_NAME_COLLISION" || code === "EEXIST") {
      return;
    }
    throw error;
  }
}

async function ensureParentDirs(client: SmbClient, path: string) {
  const parts = path.split(/\\/).filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}\\${part}` : part;
    await safeMkdir(client, current);
  }
}

async function isDirectory(client: SmbClient, path: string) {
  try {
    await smbCall<string[]>(client, "readdir", path);
    return true;
  } catch {
    return false;
  }
}

async function readAll(client: SmbClient, path: string) {
  return smbCall<Buffer>(client, "readFile", path);
}

async function deleteFolderRecursive(client: SmbClient, path: string) {
  const entries = await smbCall<string[]>(client, "readdir", path);
  for (const entry of entries) {
    const entryPath = `${path}\\${entry}`;
    try {
      await smbCall<void>(client, "unlink", entryPath);
    } catch {
      await deleteFolderRecursive(client, entryPath);
    }
  }
  await smbCall<void>(client, "rmdir", path);
}

export function createSmbProvider(options: {
  host: string;
  share: string;
  username: string;
  password: string;
  subPath?: string;
}): StorageProvider {
  const client = new SMB2({
    share: buildSmbSharePath(options.host, options.share),
    domain: DEFAULT_DOMAIN,
    username: options.username,
    password: options.password,
    autoCloseTimeout: DEFAULT_TIMEOUT,
  }) as unknown as SmbClient;

  const basePath = options.subPath ? toSmbPath(options.subPath) : "";

  return {
    list: async (path) => {
      const target = withSmbPath(basePath, path);
      const names = await smbCall<string[]>(client, "readdir", target);
      const folders: StorageEntry[] = [];
      const files: StorageEntry[] = [];
      for (const name of names) {
        const entryPath = joinPath(path, name);
        const smbEntryPath = withSmbPath(basePath, entryPath);
        const entry = {
          name,
          path: entryPath,
          updatedAt: "",
        };
        if (await isDirectory(client, smbEntryPath)) {
          folders.push({ ...entry, type: "folder" });
        } else {
          files.push({ ...entry, size: null, type: "file" });
        }
      }
      return { folders, files };
    },
    stat: async (path) => {
      const target = withSmbPath(basePath, path);
      const data = await readAll(client, target);
      return { size: data.length };
    },
    createReadStream: (path, options) => {
      const stream = new PassThrough();
      const target = withSmbPath(basePath, path);
      readAll(client, target)
        .then((data) => {
          const start = options?.start ?? 0;
          const end = options?.end ?? data.length - 1;
          stream.end(data.subarray(start, end + 1));
        })
        .catch((error) => {
          stream.destroy(error as Error);
        });
      return stream;
    },
    writeFile: async (path, data) => {
      const target = withSmbPath(basePath, path);
      const dir = target.split("\\").slice(0, -1).join("\\");
      if (dir) {
        await ensureParentDirs(client, dir);
      }
      await smbCall<void>(client, "writeFile", target, data);
    },
    createFolder: async (path) => {
      const target = withSmbPath(basePath, path);
      await ensureParentDirs(client, target);
    },
    deleteFile: async (path) => {
      const target = withSmbPath(basePath, path);
      await smbCall<void>(client, "unlink", target);
    },
    deleteFolder: async (path) => {
      const target = withSmbPath(basePath, path);
      await deleteFolderRecursive(client, target);
    },
  };
}
