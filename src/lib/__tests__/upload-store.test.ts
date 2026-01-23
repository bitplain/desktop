import { describe, expect, it } from "vitest";
import {
  addUpload,
  clearUploads,
  getUploads,
  hasActiveUploads,
  updateUpload,
} from "@/lib/uploadStore";

describe("upload store", () => {
  it("adds and updates uploads", () => {
    clearUploads();
    addUpload({ id: "1", name: "a.mp4", progress: 0, status: "queued" });
    updateUpload("1", { progress: 100, status: "done" });
    const list = getUploads();
    expect(list[0]?.name).toBe("a.mp4");
    expect(list[0]?.status).toBe("done");
  });

  it("tracks active uploads", () => {
    clearUploads();
    addUpload({ id: "1", name: "a.mp4", progress: 0, status: "queued" });
    expect(hasActiveUploads()).toBe(true);
    updateUpload("1", { status: "done" });
    expect(hasActiveUploads()).toBe(false);
  });
});
