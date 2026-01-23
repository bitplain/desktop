import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "../../middleware";
import { getToken } from "next-auth/jwt";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

const mockGetToken = getToken as unknown as ReturnType<typeof vi.fn>;

const makeRequest = (pathname: string) =>
  ({ nextUrl: { pathname }, url: `http://localhost${pathname}` } as any);

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
});
