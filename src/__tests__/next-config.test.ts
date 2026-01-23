import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next config", () => {
  it("sets proxyClientMaxBodySize for uploads", () => {
    expect(nextConfig.experimental?.proxyClientMaxBodySize).toBeDefined();
  });
});
