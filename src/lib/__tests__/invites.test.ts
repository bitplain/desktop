import { describe, expect, it } from "vitest";
import { isInviteExpired } from "../invites";

describe("invites", () => {
  it("expires after 12 hours", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const expires = isInviteExpired(created, 12);
    expect(expires).toBe(true);
  });
});
