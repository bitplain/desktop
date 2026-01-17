import { beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "../../middleware";
import { getToken } from "next-auth/jwt";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

const mockGetToken = getToken as unknown as ReturnType<typeof vi.fn>;

const makeRequest = (pathname: string) => {
  const nextUrl = new URL(`http://localhost${pathname}`);
  return {
    nextUrl,
    url: nextUrl.toString(),
    cookies: {
      get: () => undefined,
    },
  } as any;
};

describe("middleware", () => {
  beforeEach(() => {
    mockGetToken.mockReset();
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
});
