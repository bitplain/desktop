import { describe, it, expect } from "vitest";
import { modulesMeta, moduleLoaders } from "@/modules/registry";

describe("module registry", () => {
  it("exports meta + loaders", () => {
    expect(Array.isArray(modulesMeta)).toBe(true);
    expect(typeof moduleLoaders).toBe("object");
  });
});
