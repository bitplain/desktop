import { afterEach, describe, expect, it, vi } from "vitest";

const loadAuthOptions = async () => {
  vi.resetModules();
  const mod = await import("../auth");
  return mod.getAuthOptions();
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

  it("derives NEXTAUTH_URL from request headers when env missing", async () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    const mod = await import("../auth");
    const authOptions = mod.getAuthOptions({
      headers: new Headers({
        host: "10.10.1.236:3000",
        "x-forwarded-proto": "http",
      }),
    });
    expect(authOptions.useSecureCookies).toBe(false);
    expect(process.env.NEXTAUTH_URL).toBe("http://10.10.1.236:3000");
  });
});
