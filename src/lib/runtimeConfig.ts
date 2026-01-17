import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  decryptConfigPayload,
  type EncryptedConfigPayload,
} from "./configCrypto";

export type RuntimeConfig = {
  databaseUrl: string;
  nextAuthSecret: string;
  keysEncryptionSecret: string;
};

type StoredConfig = RuntimeConfig | EncryptedConfigPayload;

export function resolveConfigPath() {
  const base = process.env.DATA_DIR?.trim() || "/data";
  return resolve(base, "config.json");
}

function readConfigFile(path: string): StoredConfig | null {
  if (!existsSync(path)) {
    return null;
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as StoredConfig;
}

function buildEnvConfig(): RuntimeConfig | null {
  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() || "";
  const keysEncryptionSecret = process.env.KEYS_ENCRYPTION_SECRET?.trim() || "";
  if (!databaseUrl || !nextAuthSecret || !keysEncryptionSecret) {
    return null;
  }
  return { databaseUrl, nextAuthSecret, keysEncryptionSecret };
}

function isEncryptedConfig(value: unknown): value is EncryptedConfigPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as EncryptedConfigPayload;
  return (
    candidate.version === 1 &&
    candidate.algorithm === "aes-256-gcm" &&
    typeof candidate.salt === "string" &&
    typeof candidate.iv === "string" &&
    typeof candidate.tag === "string" &&
    typeof candidate.ciphertext === "string"
  );
}

function isRuntimeConfig(value: unknown): value is RuntimeConfig {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as RuntimeConfig;
  return (
    typeof candidate.databaseUrl === "string" &&
    typeof candidate.nextAuthSecret === "string" &&
    typeof candidate.keysEncryptionSecret === "string"
  );
}

function resolveStoredConfig(config: StoredConfig): RuntimeConfig | null {
  if (isEncryptedConfig(config)) {
    const key = process.env.CONFIG_ENCRYPTION_KEY?.trim() || "";
    if (!key) {
      return null;
    }
    try {
      const decrypted = decryptConfigPayload(config, key);
      return isRuntimeConfig(decrypted) ? decrypted : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function loadRuntimeConfig(options?: { mockConfig?: StoredConfig | null }) {
  const config = options?.mockConfig ?? readConfigFile(resolveConfigPath());
  const resolved = config ? resolveStoredConfig(config) : buildEnvConfig();
  if (!resolved) {
    return null;
  }
  process.env.DATABASE_URL ||= resolved.databaseUrl;
  process.env.NEXTAUTH_SECRET ||= resolved.nextAuthSecret;
  process.env.KEYS_ENCRYPTION_SECRET ||= resolved.keysEncryptionSecret;
  return resolved;
}
