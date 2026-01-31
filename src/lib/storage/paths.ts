export function normalizeStorageSubPath(input: string) {
  const cleaned = input.replace(/\\/g, "/").trim();
  const stripped = cleaned.replace(/^\/+/, "");
  const normalized = stripped.replace(/\/+$/, "");
  return normalized === "." ? "" : normalized;
}

export function stripVideoPrefix(path: string) {
  if (path === "video") return "";
  return path.startsWith("video/") ? path.slice("video/".length) : path;
}

export function buildRemotePath(path: string, subPath: string) {
  const tail = stripVideoPrefix(path);
  const joined = [subPath, tail].filter(Boolean).join("/");
  return joined;
}
