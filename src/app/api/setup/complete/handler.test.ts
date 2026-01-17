import { describe, expect, it, vi } from "vitest";
import { handleSetupComplete } from "./handler";

vi.mock("@/lib/rateLimit", () => ({
  consumeRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 1,
    resetAt: new Date(),
  }),
}));

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/setup/complete", {
    method: "POST",
    headers: {
      cookie: "csrf-token=test-token",
      "x-csrf-token": "test-token",
    },
    body: JSON.stringify(body),
  });

const baseDeps = {
  createDefaultSetupDeps: () => ({}),
};

describe("setup complete handler", () => {
  it("maps invalid status to 400", async () => {
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async () => ({ status: "invalid", error: "bad" }),
      ...baseDeps,
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("bad");
  });

  it("maps alreadySetup to 409", async () => {
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async () => ({ status: "alreadySetup" }),
      ...baseDeps,
    });
    expect(response.status).toBe(409);
  });

  it("maps ok to 200", async () => {
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async () => ({ status: "ok" }),
      ...baseDeps,
    });
    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });

  it("builds database url from db fields", async () => {
    let received: { databaseUrl?: string } | null = null;
    const response = await handleSetupComplete(
      makeRequest({
        dbHost: "db",
        dbPort: "5432",
        dbUser: "desktop",
        dbPassword: "desktop",
        email: "admin@test.dev",
        password: "Password1!",
      }),
      {
        completeSetup: async (input) => {
          received = input;
          return { status: "ok" };
        },
        ...baseDeps,
      }
    );

    expect(response.status).toBe(200);
    expect(received?.databaseUrl).toBe("postgresql://desktop:desktop@db:5432/desktop");
  });
});
