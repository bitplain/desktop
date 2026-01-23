import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listHandler } from "@/lib/filemanager/api";

describe("filemanager list handler", () => {
  it("returns folders/files for a user", async () => {
    const base = await mkdtemp(join(tmpdir(), "fm-"));
    const res = await listHandler({
      dataDir: base,
      userId: "user-1",
      path: "",
    });
    expect(res.folders.some((f) => f.name === "video")).toBe(true);
  });
});
