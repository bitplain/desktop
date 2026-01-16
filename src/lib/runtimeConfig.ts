import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export type RuntimeConfig = {
  databaseUrl: string;
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

export function loadRuntimeConfig(options?: { mockConfig?: RuntimeConfig | null }) {
  const config = options?.mockConfig ?? readConfigFile(resolveConfigPath());
  if (!config) {
    return null;
  }
  process.env.DATABASE_URL ||= config.databaseUrl;
  process.env.NEXTAUTH_SECRET ||= config.nextAuthSecret;
  process.env.KEYS_ENCRYPTION_SECRET ||= config.keysEncryptionSecret;
  return config;
}
