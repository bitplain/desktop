import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeConfig } from "../runtimeConfig";

const ensureDatabaseReady = vi.hoisted(() => vi.fn());
const getPrisma = vi.hoisted(() => vi.fn());

vi.mock("../databaseReady", () => ({ ensureDatabaseReady }));
vi.mock("../db", () => ({ getPrisma }));

import { getSetupStatus } from "../setupStatus";

const mockConfig: RuntimeConfig = {
  databaseUrl: "postgresql://user:pass@localhost:5432/desktop",
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
});
