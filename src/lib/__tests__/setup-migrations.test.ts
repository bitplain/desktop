import { describe, expect, it } from "vitest";
import { pickMigrationMode } from "../setupMigrations";

describe("pickMigrationMode", () => {
  it("uses deploy when migrations exist", () => {
    expect(pickMigrationMode(["20260116_init"]).mode).toBe("deploy");
  });

  it("uses push when migrations are missing", () => {
    expect(pickMigrationMode([]).mode).toBe("push");
    expect(pickMigrationMode(null).mode).toBe("push");
  });
});
