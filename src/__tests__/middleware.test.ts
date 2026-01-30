import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "../../middleware";
import { getToken } from "next-auth/jwt";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

const mockGetToken = getToken as unknown as ReturnType<typeof vi.fn>;

const makeRequest = (
  pathname: string,
  options?: { host?: string; proto?: string }
) => {
  const host = options?.host ?? "localhost";
  const proto = options?.proto ?? "http";
  return {
    nextUrl: new URL(`${proto}://${host}${pathname}`),
    url: `${proto}://${host}${pathname}`,
    headers: new Headers({
      host,
      "x-forwarded-host": host,
      "x-forwarded-proto": proto,
    }),
  } as any;
};

describe("middleware", () => {
  const originalSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    mockGetToken.mockReset();
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET;
    } else {
      process.env.NEXTAUTH_SECRET = originalSecret;
    }
  });

  it("allows static assets without redirect", async () => {
    mockGetToken.mockResolvedValue(null);
    const response = await middleware(makeRequest("/_next/static/chunks/app.css"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects unauthenticated users to login", async () => {
    mockGetToken.mockResolvedValue(null);
    const response = await middleware(makeRequest("/"));
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("skips auth redirect when NEXTAUTH_SECRET is missing", async () => {
    delete process.env.NEXTAUTH_SECRET;
    mockGetToken.mockResolvedValue(null);
    const response = await middleware(makeRequest("/"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("uses request protocol to decide secure cookies", async () => {
    mockGetToken.mockResolvedValue(null);
    await middleware(makeRequest("/", { host: "10.10.1.236:3000", proto: "http" }));
    expect(mockGetToken).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: false })
    );
  });

  it("falls back to non-secure cookie when secure cookie is missing", async () => {
    mockGetToken.mockResolvedValueOnce(null).mockResolvedValueOnce({ sub: "user-id" });
    const response = await middleware(
      makeRequest("/", { host: "10.10.1.236:3000", proto: "https" })
    );
    expect(mockGetToken).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ secureCookie: true })
    );
    expect(mockGetToken).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ secureCookie: false })
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
