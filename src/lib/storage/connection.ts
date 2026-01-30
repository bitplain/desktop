export function buildSmbSharePath(host: string, share: string) {
  const cleanHost = host.trim();
  const cleanShare = share.replace(/^[\\/]+/, "").replace(/[\\/]+$/, "");
  return `\\\\${cleanHost}\\${cleanShare}`;
}

export function toSmbPath(path: string) {
  return path.replace(/\//g, "\\");
}
