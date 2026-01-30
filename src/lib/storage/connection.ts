export function buildSmbSharePath(host: string, share: string) {
  const cleanHost = host.trim();
  const cleanShare = share.replace(/^[\\/]+/, "").replace(/[\\/]+$/, "");
  return `\\\\${cleanHost}\\${cleanShare}`;
}

export function toSmbPath(path: string) {
  return path.replace(/\//g, "\\");
}

export type StorageConnectionRecord = {
  provider: "SMB";
  host: string;
  share: string;
  subPath: string;
  username: string;
  passwordEncrypted: string;
};

export function serializeStorageConnection(record: StorageConnectionRecord) {
  return {
    provider: record.provider,
    host: record.host,
    share: record.share,
    subPath: record.subPath,
    username: record.username,
    hasPassword: Boolean(record.passwordEncrypted),
  };
}
