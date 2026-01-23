import { describe, expect, it } from "vitest";
import {
  getCurrentVideo,
  moveVideoSelection,
  setVideoSelection,
} from "@/lib/videoSelectionStore";

describe("video selection store", () => {
  it("stores selection from a list", () => {
    setVideoSelection(
      [
        { path: "video/a.mp4", name: "a.mp4" },
        { path: "video/b.mp4", name: "b.mp4" },
      ],
      "video/b.mp4"
    );
    expect(getCurrentVideo()?.path).toBe("video/b.mp4");
  });

  it("moves selection without wrapping", () => {
    setVideoSelection(
      [
        { path: "video/a.mp4", name: "a.mp4" },
        { path: "video/b.mp4", name: "b.mp4" },
      ],
      "video/a.mp4"
    );
    moveVideoSelection(1);
    expect(getCurrentVideo()?.path).toBe("video/b.mp4");
    moveVideoSelection(1);
    expect(getCurrentVideo()?.path).toBe("video/b.mp4");
    moveVideoSelection(-1);
    expect(getCurrentVideo()?.path).toBe("video/a.mp4");
  });
});
