import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const expectDynamic = (relativePath: string) => {
  const content = readFileSync(resolve(root, relativePath), "utf-8");
  expect(content).toMatch(/export const dynamic\s*=\s*["']force-dynamic["']/);
};

describe("dynamic pages", () => {
  it("marks setup-related pages as dynamic", () => {
    expectDynamic("src/app/page.tsx");
    expectDynamic("src/app/setup/page.tsx");
    expectDynamic("src/app/setup/admin/page.tsx");
  });
});
