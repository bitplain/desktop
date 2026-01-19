import { resolve, relative, sep, posix } from "node:path";

const RESERVED_ROOT = new Set(["video"]);

export function buildUserRoot(dataDir: string, userId: string) {
  return resolve(dataDir, "filemanager", userId);
}

export function normalizeRelativePath(input: string) {
  const cleaned = input.replace(/\\/g, "/").trim();
  const stripped = cleaned.replace(/^\/+/, "");
  const normalized = posix.normalize(stripped);
  return normalized === "." ? "" : normalized;
}

export function resolveUserPath(dataDir: string, userId: string, relativePath: string) {
  const root = buildUserRoot(dataDir, userId);
  const normalized = normalizeRelativePath(relativePath);
  const target = resolve(root, normalized || ".");
  const rel = relative(root, target);
  if (rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..")) {
    return { root, target, relative: normalized };
  }
  throw new Error("Path escapes user root");
}

export function isReservedRootFolder(name: string) {
  return RESERVED_ROOT.has(name.toLowerCase());
}
