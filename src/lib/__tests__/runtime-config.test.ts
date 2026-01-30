import { describe, expect, it, vi } from "vitest";
import { loadRuntimeConfig, resolveConfigPath } from "../runtimeConfig";

describe("runtime config", () => {
  it("uses /data/config.json by default", () => {
    vi.stubEnv("DATA_DIR", "");
    expect(resolveConfigPath()).toBe("/data/config.json");
  });

  it("sets env vars when config exists", () => {
    vi.stubEnv("DATABASE_URL", "");
    const config = {
      databaseUrl: "postgresql://user:pass@host/db",
      databaseSsl: true,
      nextAuthUrl: "http://10.10.1.236:3000",
      nextAuthSecret: "secret1234567890abcd",
      keysEncryptionSecret: "secret1234567890abcd",
    };
    const load = loadRuntimeConfig({
      mockConfig: config,
    });
    expect(load.databaseUrl).toBe(config.databaseUrl);
    expect(process.env.DATABASE_URL).toBe(config.databaseUrl);
    expect(process.env.DATABASE_SSL).toBe("true");
    expect(process.env.NEXTAUTH_URL).toBe("http://10.10.1.236:3000");
  });

  it("falls back to env vars when config file is missing", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@db:5432/desktop");
    vi.stubEnv("DATABASE_SSL", "true");
    vi.stubEnv("NEXTAUTH_SECRET", "secret1234567890abcd");
    vi.stubEnv("NEXTAUTH_URL", "http://10.10.1.236:3000");
    vi.stubEnv("KEYS_ENCRYPTION_SECRET", "secret1234567890abcd");
    const load = loadRuntimeConfig({ mockConfig: null });
    expect(load?.databaseUrl).toBe("postgresql://user:pass@db:5432/desktop");
    expect(load?.databaseSsl).toBe(true);
    expect(load?.nextAuthUrl).toBe("http://10.10.1.236:3000");
  });
});
