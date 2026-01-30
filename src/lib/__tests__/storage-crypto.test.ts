import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/storage/crypto";

describe("storage crypto", () => {
  it("round trips secret", () => {
    const cipher = encryptSecret("pass", "secret1234567890abcd");
    expect(decryptSecret(cipher, "secret1234567890abcd")).toBe("pass");
  });
});
