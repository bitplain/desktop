import { Client, FileType } from "basic-ftp";
import { PassThrough, Readable } from "node:stream";
import { stripVideoPrefix } from "@/lib/storage/paths";
import type { StorageEntry, StorageProvider } from "@/lib/storage/types";

export function buildFtpPath(path: string, subPath: string) {
  const tail = stripVideoPrefix(path);
  return [subPath, tail].filter(Boolean).join("/");
}

function normalizeFtpTarget(path: string) {
  return path || ".";
}

async function withClient<T>(
  options: { host: string; port: number; username: string; password: string },
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client();
  try {
    await client.access({
      host: options.host,
      port: options.port,
      user: options.username,
      password: options.password,
      secure: false,
    });
    return await fn(client);
  } finally {
    client.close();
  }
}

function splitEntries(path: string, items: Awaited<ReturnType<Client["list"]>>) {
  const folders: StorageEntry[] = [];
  const files: StorageEntry[] = [];
  for (const item of items) {
    const entryPath = [path, item.name].filter(Boolean).join("/");
    const updatedAt = item.modifiedAt ? item.modifiedAt.toISOString() : "";
    if (item.type === FileType.Directory || item.isDirectory) {
      folders.push({
        name: item.name,
        path: entryPath,
        updatedAt,
        type: "folder",
      });
    } else {
      files.push({
        name: item.name,
        path: entryPath,
        size: Number.isFinite(item.size) ? item.size : null,
        updatedAt,
        type: "file",
      });
    }
  }
  return { folders, files };
}

export function createFtpProvider(config: {
  host: string;
  port?: number | null;
  username: string;
  password: string;
  subPath?: string;
}): StorageProvider {
  const basePath = config.subPath?.trim() ?? "";
  const port = config.port && config.port > 0 ? config.port : 21;

  return {
    list: async (path) => {
      const target = normalizeFtpTarget(path);
      return withClient(
        { host: config.host, port, username: config.username, password: config.password },
        async (client) => {
          if (basePath) {
            await client.cd(basePath);
          }
          const items = await client.list(target);
          return splitEntries(path, items);
        }
      );
    },
    stat: async (path) => {
      const target = normalizeFtpTarget(path);
      return withClient(
        { host: config.host, port, username: config.username, password: config.password },
        async (client) => {
          if (basePath) {
            await client.cd(basePath);
          }
          const size = await client.size(target);
          return { size };
        }
      );
    },
    createReadStream: (path, options) => {
      const stream = new PassThrough();
      const target = normalizeFtpTarget(path);
      void withClient(
        { host: config.host, port, username: config.username, password: config.password },
        async (client) => {
          if (basePath) {
            await client.cd(basePath);
          }
          const startAt = options?.start ?? 0;
          await client.downloadTo(stream, target, startAt);
        }
      ).catch((error) => {
        stream.destroy(error as Error);
      });
      return stream;
    },
    writeFile: async (path, data) => {
      const target = normalizeFtpTarget(path);
      return withClient(
        { host: config.host, port, username: config.username, password: config.password },
        async (client) => {
          if (basePath) {
            await client.cd(basePath);
          }
          await client.uploadFrom(Readable.from(data), target);
        }
      );
    },
    createFolder: async (path) => {
      const target = normalizeFtpTarget(path);
      return withClient(
        { host: config.host, port, username: config.username, password: config.password },
        async (client) => {
          if (basePath) {
            await client.cd(basePath);
          }
          await client.ensureDir(target);
        }
      );
    },
    deleteFile: async (path) => {
      const target = normalizeFtpTarget(path);
      return withClient(
        { host: config.host, port, username: config.username, password: config.password },
        async (client) => {
          if (basePath) {
            await client.cd(basePath);
          }
          await client.remove(target);
        }
      );
    },
    deleteFolder: async (path) => {
      const target = normalizeFtpTarget(path);
      return withClient(
        { host: config.host, port, username: config.username, password: config.password },
        async (client) => {
          if (basePath) {
            await client.cd(basePath);
          }
          await client.removeDir(target);
        }
      );
    },
  };
}
