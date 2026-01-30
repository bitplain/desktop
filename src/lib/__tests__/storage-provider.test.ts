import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalProvider } from "@/lib/storage/localProvider";
import { buildRemotePath } from "@/lib/storage/paths";

describe("storage paths", () => {
  it("maps video prefix to subpath", () => {
    expect(buildRemotePath("video/cats/clip.mp4", "media/videos")).toBe(
      "media/videos/cats/clip.mp4"
    );
  });
});

describe("local storage provider", () => {
  it("lists video root", async () => {
    const base = await mkdtemp(join(tmpdir(), "fm-"));
    const provider = createLocalProvider({ dataDir: base, userId: "user-1" });
    const result = await provider.list("");
    expect(result.folders.some((folder) => folder.name === "video")).toBe(true);
  });
});
