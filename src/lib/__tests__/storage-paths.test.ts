import { describe, expect, it } from "vitest";
import { buildRemotePath, normalizeStorageSubPath } from "@/lib/storage/paths";

describe("storage subpath normalize", () => {
  it("keeps safe normalized path", () => {
    expect(normalizeStorageSubPath("media/videos")).toBe("media/videos");
  });

  it("maps video root to smb share root", () => {
    expect(buildRemotePath("video", "")).toBe("\\");
  });
});
