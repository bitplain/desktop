export function normalizeStorageSubPath(input: string) {
  const cleaned = input.replace(/\\/g, "/").trim();
  const stripped = cleaned.replace(/^\/+/, "");
  const normalized = stripped.replace(/\/+$/, "");
  return normalized === "." ? "" : normalized;
}
