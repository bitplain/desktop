import { describe, expect, it, vi } from "vitest";
import { completeSetup, type SetupCompletionDeps } from "../setupCompletion";

const baseDeps = (): SetupCompletionDeps => ({
  loadConfig: () => null,
  writeConfig: vi.fn().mockResolvedValue(undefined),
  applyConfig: vi.fn(),
  ensureDatabaseExists: vi.fn().mockResolvedValue(undefined),
  runMigrations: vi.fn().mockResolvedValue(undefined),
  getUserCount: vi.fn().mockResolvedValue(0),
  createAdmin: vi.fn().mockResolvedValue(undefined),
  generateSecret: () => "secret-1234567890",
  validateDatabaseUrl: (url) =>
    url.startsWith("postgres") ? { ok: true } : { ok: false, error: "bad" },
  validateEmail: (email) => ({ ok: true, value: email }),
  validatePassword: (password) => ({ ok: true, value: password }),
});

describe("setup completion", () => {
  it("rejects invalid database url when config is missing", async () => {
    const deps = baseDeps();
    const result = await completeSetup(
      { databaseUrl: "mysql://db", email: "admin@test.dev", password: "Password1!" },
      deps
    );
    expect(result.status).toBe("invalid");
  });

  it("writes config and creates admin when fresh", async () => {
    const deps = baseDeps();
    const result = await completeSetup(
      { databaseUrl: "postgres://db", email: "admin@test.dev", password: "Password1!" },
      deps
    );
    expect(result.status).toBe("ok");
    expect(deps.writeConfig).toHaveBeenCalledOnce();
    expect(deps.applyConfig).toHaveBeenCalledOnce();
    expect(deps.ensureDatabaseExists).toHaveBeenCalledOnce();
    expect(deps.runMigrations).toHaveBeenCalledOnce();
    expect(deps.createAdmin).toHaveBeenCalledOnce();
  });

  it("uses env secrets when provided", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "env-nextauth");
    vi.stubEnv("KEYS_ENCRYPTION_SECRET", "env-keys");
    const deps = baseDeps();
    let writtenConfig:
      | { databaseUrl: string; nextAuthSecret: string; keysEncryptionSecret: string }
      | null = null;
    deps.writeConfig = vi.fn(async (config) => {
      writtenConfig = config;
    });
    const result = await completeSetup(
      { databaseUrl: "postgres://db", email: "admin@test.dev", password: "Password1!" },
      deps
    );
    expect(result.status).toBe("ok");
    expect(writtenConfig?.nextAuthSecret).toBe("env-nextauth");
    expect(writtenConfig?.keysEncryptionSecret).toBe("env-keys");
  });

  it("skips config write when config exists", async () => {
    const deps = baseDeps();
    deps.loadConfig = () => ({
      databaseUrl: "postgres://existing",
      nextAuthSecret: "secret-aaaaaaaaaaaaaaa",
      keysEncryptionSecret: "secret-bbbbbbbbbbbbbbb",
    });
    const result = await completeSetup(
      { databaseUrl: "postgres://ignored", email: "admin@test.dev", password: "Password1!" },
      deps
    );
    expect(result.status).toBe("ok");
    expect(deps.writeConfig).not.toHaveBeenCalled();
    expect(deps.ensureDatabaseExists).toHaveBeenCalledOnce();
  });

  it("returns alreadySetup when users exist", async () => {
    const deps = baseDeps();
    deps.getUserCount = vi.fn().mockResolvedValue(2);
    const result = await completeSetup(
      { databaseUrl: "postgres://db", email: "admin@test.dev", password: "Password1!" },
      deps
    );
    expect(result.status).toBe("alreadySetup");
    expect(deps.createAdmin).not.toHaveBeenCalled();
    expect(deps.ensureDatabaseExists).toHaveBeenCalledOnce();
  });
});
