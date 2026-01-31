import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureUserVideoRoot,
  listEntries,
  createFolder,
  deleteFolder,
  deleteFile,
} from "@/lib/filemanager/service";

describe("filemanager service", () => {
  it("creates video root and lists entries", async () => {
    const base = await mkdtemp(join(tmpdir(), "fm-"));
    await ensureUserVideoRoot(base, "user-1");
    const result = await listEntries(base, "user-1", "");
    expect(result.folders.some((f) => f.name === "video")).toBe(true);
    expect(result.folders.some((f) => f.name === "foto")).toBe(true);
  });

  it("creates and deletes folders", async () => {
    const base = await mkdtemp(join(tmpdir(), "fm-"));
    await ensureUserVideoRoot(base, "user-1");
    await createFolder(base, "user-1", "", "docs");
    const before = await listEntries(base, "user-1", "");
    expect(before.folders.some((f) => f.name === "docs")).toBe(true);
    await deleteFolder(base, "user-1", "docs");
    const after = await listEntries(base, "user-1", "");
    expect(after.folders.some((f) => f.name === "docs")).toBe(false);
  });

  it("deletes files", async () => {
    const base = await mkdtemp(join(tmpdir(), "fm-"));
    await ensureUserVideoRoot(base, "user-1");
    const filePath = join(base, "filemanager", "user-1", "video", "a.mp4");
    await writeFile(filePath, "data");
    await deleteFile(base, "user-1", "video/a.mp4");
  });
});
