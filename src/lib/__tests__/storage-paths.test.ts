import { describe, expect, it } from "vitest";
import { normalizeStorageSubPath } from "@/lib/storage/paths";

describe("storage subpath normalize", () => {
  it("keeps safe normalized path", () => {
    expect(normalizeStorageSubPath("media/videos")).toBe("media/videos");
  });
});
