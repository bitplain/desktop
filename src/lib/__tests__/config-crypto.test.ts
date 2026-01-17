import { describe, it, expect } from "vitest";
import { decryptConfigPayload, encryptConfigPayload } from "../configCrypto";

describe("config encryption", () => {
  it("round-trips payload", () => {
    const key = "test-key-1234567890";
    const payload = {
      databaseUrl: "postgres://x",
      nextAuthSecret: "a",
      keysEncryptionSecret: "b",
    };
    const encrypted = encryptConfigPayload(payload, key);
    const decrypted = decryptConfigPayload(encrypted, key);
    expect(decrypted).toEqual(payload);
  });
});
