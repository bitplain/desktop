import { describe, expect, it } from "vitest";
import {
  buildSmbSharePath,
  serializeStorageConnection,
  type StorageConnectionRecord,
} from "@/lib/storage/connection";

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

  it("serializes ftp provider", () => {
    const record = {
      provider: "FTP",
      host: "10.0.0.1",
      share: "",
      subPath: "video",
      username: "user",
      passwordEncrypted: "secret",
      port: 21,
    } as unknown as StorageConnectionRecord;

    expect(serializeStorageConnection(record)).toEqual({
      provider: "FTP",
      host: "10.0.0.1",
      share: "",
      subPath: "video",
      username: "user",
      port: 21,
      hasPassword: true,
    });
  });
});
