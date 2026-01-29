import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeConfig } from "../runtimeConfig";

const ensureDatabaseReady = vi.hoisted(() => vi.fn());
const getPrisma = vi.hoisted(() => vi.fn());

vi.mock("../databaseReady", () => ({ ensureDatabaseReady }));
vi.mock("../db", () => ({ getPrisma }));

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

  it("auto-enables ssl during setup when self-signed error occurs", async () => {
    const count = vi.fn().mockResolvedValue(0);
    getPrisma.mockReturnValue({ user: { count } });
    ensureDatabaseReady
      .mockRejectedValueOnce(new Error("self-signed certificate"))
      .mockResolvedValueOnce(undefined);
    const saveConfig = vi.fn().mockResolvedValue(undefined);

    const status = await getSetupStatus({
      mockConfig,
      allowAutoSslFix: true,
      saveConfig,
    });

    expect(status).toBe("needsAdmin");
    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        databaseSsl: true,
      })
    );
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(2);
    const secondCallUrl = ensureDatabaseReady.mock.calls[1]?.[0] as string;
    expect(secondCallUrl).toContain("sslmode=require");
    expect(secondCallUrl).toContain("sslaccept=accept_invalid_certs");
  });

  it("does not auto-enable ssl when not in setup flow", async () => {
    ensureDatabaseReady.mockRejectedValue(new Error("self signed certificate"));
    const saveConfig = vi.fn().mockResolvedValue(undefined);

    const status = await getSetupStatus({
      mockConfig,
      saveConfig,
    });

    expect(status).toBe("dbUnavailable");
    expect(saveConfig).not.toHaveBeenCalled();
  });
});
