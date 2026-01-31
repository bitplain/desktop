export function buildSmbSharePath(host: string, share: string) {
  const cleanHost = host.trim();
  const cleanShare = share.replace(/^[\\/]+/, "").replace(/[\\/]+$/, "");
  return `\\\\${cleanHost}\\${cleanShare}`;
}

export function toSmbPath(path: string) {
  return path.replace(/\//g, "\\");
}

export type StorageConnectionRecord = {
  provider: "SMB" | "FTP";
  host: string;
  share: string;
  subPath: string;
  username: string;
  passwordEncrypted: string;
  port?: number | null;
};

export type StorageProviderId = StorageConnectionRecord["provider"];

export function selectActiveConnection(
  activeProvider: StorageProviderId | null,
  connections: StorageConnectionRecord[]
) {
  if (!activeProvider) {
    return null;
  }
  return connections.find((connection) => connection.provider === activeProvider) ?? null;
}

export function serializeStorageConnection(record: StorageConnectionRecord) {
  const base = {
    provider: record.provider,
    host: record.host,
    share: record.share,
    subPath: record.subPath,
    username: record.username,
    hasPassword: Boolean(record.passwordEncrypted),
  };
  if (record.port == null) {
    return base;
  }
  return { ...base, port: record.port };
}
