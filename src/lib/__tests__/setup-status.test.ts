import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeConfig } from "../runtimeConfig";

const ensureDatabaseReady = vi.hoisted(() => vi.fn());
const getPrisma = vi.hoisted(() => vi.fn());
const repairDatabaseAccess = vi.hoisted(() => vi.fn());

vi.mock("../databaseReady", () => ({ ensureDatabaseReady }));
vi.mock("../db", () => ({ getPrisma }));
vi.mock("../adminRepair", () => ({ repairDatabaseAccess }));

import { getSetupStatus } from "../setupStatus";

const mockConfig: RuntimeConfig = {
  databaseUrl: "postgresql://user:pass@localhost:5432/desktop",
  databaseSsl: false,
  nextAuthSecret: "secret",
  keysEncryptionSecret: "keys",
};

describe("setup status", () => {
  beforeEach(() => {
    ensureDatabaseReady.mockReset();
    getPrisma.mockReset();
  });

  it("returns needsSetup when no config", async () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(await getSetupStatus({ mockConfig: null })).toBe("needsSetup");
    expect(ensureDatabaseReady).not.toHaveBeenCalled();
  });

  it("runs migrations before counting users when config exists", async () => {
    const count = vi.fn().mockResolvedValue(0);
    getPrisma.mockReturnValue({ user: { count } });
    ensureDatabaseReady.mockResolvedValue(undefined);

    expect(await getSetupStatus({ mockConfig })).toBe("needsAdmin");
    expect(ensureDatabaseReady).toHaveBeenCalledWith(mockConfig.databaseUrl);
    expect(count).toHaveBeenCalledOnce();
  });

  it("returns dbUnavailable when migrations fail", async () => {
    ensureDatabaseReady.mockRejectedValue(new Error("boom"));
    expect(await getSetupStatus({ mockConfig })).toBe("dbUnavailable");
  });

  it("auto-repairs when access is denied during setup", async () => {
    const count = vi.fn().mockResolvedValue(0);
    getPrisma.mockReturnValue({ user: { count } });
    ensureDatabaseReady
      .mockRejectedValueOnce(new Error("permission denied"))
      .mockResolvedValueOnce(undefined);
    repairDatabaseAccess.mockResolvedValue(undefined);

    const status = await getSetupStatus({ mockConfig, allowAutoDbFix: true });

    expect(status).toBe("needsAdmin");
    expect(repairDatabaseAccess).toHaveBeenCalledWith({
      databaseUrl: mockConfig.databaseUrl,
      databaseSsl: mockConfig.databaseSsl,
    });
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(2);
  });

  it("auto-repairs when database is missing during setup", async () => {
    const count = vi.fn().mockResolvedValue(0);
    getPrisma.mockReturnValue({ user: { count } });
    ensureDatabaseReady
      .mockRejectedValueOnce(new Error('database "desktop" does not exist'))
      .mockResolvedValueOnce(undefined);
    repairDatabaseAccess.mockResolvedValue(undefined);

    const status = await getSetupStatus({ mockConfig, allowAutoDbFix: true });

    expect(status).toBe("needsAdmin");
    expect(repairDatabaseAccess).toHaveBeenCalled();
  });
});
