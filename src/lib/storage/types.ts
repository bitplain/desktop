export type StorageEntry = {
  name: string;
  path: string;
  size?: number | null;
  updatedAt: string;
  type: "file" | "folder";
};

export type StorageProvider = {
  list: (path: string) => Promise<{ folders: StorageEntry[]; files: StorageEntry[] }>;
  stat: (path: string) => Promise<{ size: number }>;
  createReadStream: (
    path: string,
    options?: { start?: number; end?: number }
  ) => NodeJS.ReadableStream;
  writeFile: (path: string, data: Buffer) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  deleteFolder: (path: string) => Promise<void>;
};
