import { describe, expect, it } from "vitest";
import {
  buildUserRoot,
  normalizeRelativePath,
  resolveUserPath,
  isReservedRootFolder,
} from "@/lib/filemanager/paths";

describe("filemanager paths", () => {
  it("normalizes relative paths", () => {
    expect(normalizeRelativePath("/video/../video/a.mp4")).toBe("video/a.mp4");
    expect(normalizeRelativePath("/")).toBe("");
  });

  it("builds user root under data dir", () => {
    expect(buildUserRoot("/data", "user-1")).toBe("/data/filemanager/user-1");
  });

  it("blocks traversal outside user root", () => {
    expect(() => resolveUserPath("/data", "user-1", "../secret.txt")).toThrow();
  });

  it("detects reserved root folders", () => {
    expect(isReservedRootFolder("video")).toBe(true);
    expect(isReservedRootFolder("docs")).toBe(false);
  });
});
