import { describe, expect, it, vi } from "vitest";
import { encryptConfigPayload } from "../configCrypto";
import { loadRuntimeConfig, resolveConfigPath } from "../runtimeConfig";

describe("runtime config", () => {
  it("uses /data/config.json by default", () => {
    vi.stubEnv("DATA_DIR", "");
    expect(resolveConfigPath()).toBe("/data/config.json");
  });

  it("sets env vars when encrypted config exists", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("CONFIG_ENCRYPTION_KEY", "secret-key-1234567890");
    const config = {
      databaseUrl: "postgresql://user:pass@host/db",
      nextAuthSecret: "secret1234567890abcd",
      keysEncryptionSecret: "secret1234567890abcd",
    };
    const encrypted = encryptConfigPayload(config, "secret-key-1234567890");
    const load = loadRuntimeConfig({
      mockConfig: encrypted,
    });
    expect(load.databaseUrl).toBe(config.databaseUrl);
    expect(process.env.DATABASE_URL).toBe(config.databaseUrl);
  });

  it("returns null when encryption key is missing", () => {
    vi.stubEnv("CONFIG_ENCRYPTION_KEY", "");
    const config = {
      databaseUrl: "postgresql://user:pass@host/db",
      nextAuthSecret: "secret1234567890abcd",
      keysEncryptionSecret: "secret1234567890abcd",
    };
    const encrypted = encryptConfigPayload(config, "secret-key-1234567890");
    const load = loadRuntimeConfig({
      mockConfig: encrypted,
    });
    expect(load).toBeNull();
  });

  it("falls back to env vars when config file is missing", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@db:5432/desktop");
    vi.stubEnv("NEXTAUTH_SECRET", "secret1234567890abcd");
    vi.stubEnv("KEYS_ENCRYPTION_SECRET", "secret1234567890abcd");
    const load = loadRuntimeConfig({ mockConfig: null });
    expect(load?.databaseUrl).toBe("postgresql://user:pass@db:5432/desktop");
  });
});
