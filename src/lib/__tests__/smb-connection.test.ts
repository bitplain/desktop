import { describe, expect, it } from "vitest";
import { buildSmbSharePath, serializeStorageConnection } from "@/lib/storage/connection";

describe("smb connection helpers", () => {
  it("builds UNC share path", () => {
    expect(buildSmbSharePath("10.0.0.1", "media")).toBe("\\\\10.0.0.1\\media");
  });

  it("hides encrypted password in API payload", () => {
    expect(
      serializeStorageConnection({
        provider: "SMB",
        host: "10.0.0.1",
        share: "media",
        subPath: "videos",
        username: "user",
        passwordEncrypted: "secret",
      })
    ).toEqual({
      provider: "SMB",
      host: "10.0.0.1",
      share: "media",
      subPath: "videos",
      username: "user",
      hasPassword: true,
    });
  });
});
