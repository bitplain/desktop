import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

describe("migrations", () => {
  it("has an initial migration in repo", () => {
    const dir = join(process.cwd(), "prisma/migrations");
    expect(existsSync(dir)).toBe(true);
    const entries = readdirSync(dir).filter((entry) =>
      statSync(join(dir, entry)).isDirectory()
    );
    expect(entries.length).toBeGreaterThan(0);
  });
});
