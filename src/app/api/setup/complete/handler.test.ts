import { describe, expect, it } from "vitest";
import { handleSetupComplete } from "./handler";

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/setup/complete", {
    method: "POST",
    body: JSON.stringify(body),
  });

const baseDeps = {
  createDefaultSetupDeps: () => ({}),
  getSetupStatus: async () => "needsSetup" as const,
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

  it("maps alreadySetup to 200", async () => {
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async () => ({ status: "alreadySetup" }),
      ...baseDeps,
    });
    expect(response.status).toBe(200);
    expect((await response.json()).alreadySetup).toBe(true);
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
        dbName: "customdb",
        dbSsl: true,
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
    expect(received?.databaseUrl).toBe(
      "postgresql://desktop:desktop@db:5432/customdb?sslmode=require&sslaccept=accept_invalid_certs&uselibpqcompat=true"
    );
  });

  it("allows database override when db is unavailable", async () => {
    let received: { allowDatabaseUrlOverride?: boolean } | null = null;
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async (input) => {
        received = input;
        return { status: "ok" };
      },
      createDefaultSetupDeps: () => ({}),
      getSetupStatus: async () => "dbUnavailable",
    });

    expect(response.status).toBe(200);
    expect(received?.allowDatabaseUrlOverride).toBe(true);
  });
});
