import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalProvider } from "@/lib/storage/localProvider";
import { buildRemotePath } from "@/lib/storage/paths";
import {
  selectActiveConnection,
  type StorageConnectionRecord,
} from "@/lib/storage/connection";

const smbConnection: StorageConnectionRecord = {
  provider: "SMB",
  host: "10.0.0.1",
  share: "media",
  subPath: "",
  username: "user",
  passwordEncrypted: "secret",
};

const ftpConnection: StorageConnectionRecord = {
  provider: "FTP",
  host: "10.0.0.2",
  share: "",
  subPath: "video",
  username: "user",
  passwordEncrypted: "secret",
  port: 21,
};

describe("storage paths", () => {
  it("maps video prefix to subpath", () => {
    expect(buildRemotePath("video/cats/clip.mp4", "media/videos")).toBe(
      "media/videos/cats/clip.mp4"
    );
  });
});

describe("local storage provider", () => {
  it("lists video root", async () => {
    const base = await mkdtemp(join(tmpdir(), "fm-"));
    const provider = createLocalProvider({ dataDir: base, userId: "user-1" });
    const result = await provider.list("");
    expect(result.folders.some((folder) => folder.name === "video")).toBe(true);
  });
});

describe("storage provider selection", () => {
  it("selects active provider", () => {
    const result = selectActiveConnection("FTP", [smbConnection, ftpConnection]);
    expect(result?.provider).toBe("FTP");
  });

  it("returns null when active provider is missing", () => {
    const result = selectActiveConnection(null, [smbConnection]);
    expect(result).toBeNull();
  });
});
