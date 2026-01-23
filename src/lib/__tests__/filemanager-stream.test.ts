import { describe, expect, it } from "vitest";
import { parseRange } from "@/lib/filemanager/stream";

describe("parseRange", () => {
  it("parses byte ranges", () => {
    expect(parseRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange("bytes=10-", 100)).toEqual({ start: 10, end: 99 });
  });
});
