import { describe, expect, it } from "vitest";
import { hashInviteCode, verifyInviteCode } from "../inviteCodes";

describe("invite codes", () => {
  it("verifies hashed code", async () => {
    const raw = "INVITE-123";
    const hash = await hashInviteCode(raw);
    expect(await verifyInviteCode(raw, hash)).toBe(true);
  });
});
