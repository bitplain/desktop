import { afterEach, describe, expect, it, vi } from "vitest";

const loadAuthOptions = async () => {
  vi.resetModules();
  const mod = await import("../auth");
  return mod.authOptions;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("auth options", () => {
  it("disables secure cookies for http NEXTAUTH_URL", async () => {
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    const authOptions = await loadAuthOptions();
    expect(authOptions.useSecureCookies).toBe(false);
  });

  it("enables secure cookies for https NEXTAUTH_URL", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://example.test");
    const authOptions = await loadAuthOptions();
    expect(authOptions.useSecureCookies).toBe(true);
  });
});
