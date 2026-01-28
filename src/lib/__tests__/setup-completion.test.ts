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
    expect(deps.runMigrations).toHaveBeenCalledOnce();
    expect(deps.createAdmin).toHaveBeenCalledOnce();
  });

  it("does not attempt to create databases automatically", async () => {
    const deps = baseDeps();
    const result = await completeSetup(
      { databaseUrl: "postgres://db", email: "admin@test.dev", password: "Password1!" },
      deps
    );
    expect(result.status).toBe("ok");
    expect(deps.ensureDatabaseExists).not.toHaveBeenCalled();
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
  });

  it("overrides database url when allowed", async () => {
    const deps = baseDeps();
    const writeConfig = vi.fn().mockResolvedValue(undefined);
    const applyConfig = vi.fn();
    deps.loadConfig = () => ({
      databaseUrl: "postgres://existing",
      nextAuthSecret: "secret-aaaaaaaaaaaaaaa",
      keysEncryptionSecret: "secret-bbbbbbbbbbbbbbb",
    });
    deps.writeConfig = writeConfig;
    deps.applyConfig = applyConfig;

    const result = await completeSetup(
      {
        databaseUrl: "postgres://new",
        email: "admin@test.dev",
        password: "Password1!",
        allowDatabaseUrlOverride: true,
      },
      deps
    );

    expect(result.status).toBe("ok");
    expect(writeConfig).toHaveBeenCalledWith({
      databaseUrl: "postgres://new",
      nextAuthSecret: "secret-aaaaaaaaaaaaaaa",
      keysEncryptionSecret: "secret-bbbbbbbbbbbbbbb",
    });
    expect(applyConfig).toHaveBeenCalledWith({
      databaseUrl: "postgres://new",
      nextAuthSecret: "secret-aaaaaaaaaaaaaaa",
      keysEncryptionSecret: "secret-bbbbbbbbbbbbbbb",
    });
  });

  it("rejects override when database url is invalid", async () => {
    const deps = baseDeps();
    deps.loadConfig = () => ({
      databaseUrl: "postgres://existing",
      nextAuthSecret: "secret-aaaaaaaaaaaaaaa",
      keysEncryptionSecret: "secret-bbbbbbbbbbbbbbb",
    });

    const result = await completeSetup(
      {
        databaseUrl: "mysql://bad",
        email: "admin@test.dev",
        password: "Password1!",
        allowDatabaseUrlOverride: true,
      },
      deps
    );

    expect(result.status).toBe("invalid");
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
  });
});
