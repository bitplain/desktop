import { describe, expect, it } from "vitest";
import { buildSmbSharePath } from "@/lib/storage/connection";

describe("smb connection helpers", () => {
  it("builds UNC share path", () => {
    expect(buildSmbSharePath("10.0.0.1", "media")).toBe("\\\\10.0.0.1\\media");
  });
});
