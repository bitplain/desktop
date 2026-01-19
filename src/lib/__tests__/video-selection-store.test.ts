import { describe, expect, it } from "vitest";
import { getCurrentVideo, setCurrentVideo } from "@/lib/videoSelectionStore";

describe("video selection store", () => {
  it("stores selection", () => {
    setCurrentVideo({ path: "video/a.mp4", name: "a.mp4" });
    expect(getCurrentVideo()?.path).toBe("video/a.mp4");
  });
});
