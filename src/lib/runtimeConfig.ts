import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export type RuntimeConfig = {
  databaseUrl: string;
  databaseSsl?: boolean;
  nextAuthUrl?: string;
  nextAuthSecret: string;
  keysEncryptionSecret: string;
};

export function resolveConfigPath() {
  const base = process.env.DATA_DIR?.trim() || "/data";
  return resolve(base, "config.json");
}

function readConfigFile(path: string): RuntimeConfig | null {
  if (!existsSync(path)) {
    return null;
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as RuntimeConfig;
}

function buildEnvConfig(): RuntimeConfig | null {
  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  const databaseSsl = process.env.DATABASE_SSL?.trim() || "";
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || "";
  const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() || "";
  const keysEncryptionSecret = process.env.KEYS_ENCRYPTION_SECRET?.trim() || "";
  if (!databaseUrl || !nextAuthSecret || !keysEncryptionSecret) {
    return null;
  }
  return {
    databaseUrl,
    databaseSsl: databaseSsl ? databaseSsl === "true" : undefined,
    nextAuthUrl: nextAuthUrl || undefined,
    nextAuthSecret,
    keysEncryptionSecret,
  };
}

export function loadRuntimeConfig(options?: { mockConfig?: RuntimeConfig | null }) {
  const config = options?.mockConfig ?? readConfigFile(resolveConfigPath());
  const resolved = config ?? buildEnvConfig();
  if (!resolved) {
    return null;
  }
  process.env.DATABASE_URL ||= resolved.databaseUrl;
  if (resolved.databaseSsl !== undefined) {
    process.env.DATABASE_SSL ||= resolved.databaseSsl ? "true" : "false";
  }
  if (resolved.nextAuthUrl) {
    process.env.NEXTAUTH_URL ||= resolved.nextAuthUrl;
  }
  process.env.NEXTAUTH_SECRET ||= resolved.nextAuthSecret;
  process.env.KEYS_ENCRYPTION_SECRET ||= resolved.keysEncryptionSecret;
  return resolved;
}
