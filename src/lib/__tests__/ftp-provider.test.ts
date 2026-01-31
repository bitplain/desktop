import { describe, expect, it } from "vitest";
import { buildFtpPath } from "@/lib/storage/ftpProvider";

describe("ftp provider", () => {
  it("maps video root to ftp subPath", () => {
    expect(buildFtpPath("video", "video")).toBe("video");
  });
});
