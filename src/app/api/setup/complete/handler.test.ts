import { describe, expect, it } from "vitest";
import { handleSetupComplete } from "./handler";

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/setup/complete", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("setup complete handler", () => {
  it("maps invalid status to 400", async () => {
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async () => ({ status: "invalid", error: "bad" }),
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("bad");
  });

  it("maps alreadySetup to 409", async () => {
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async () => ({ status: "alreadySetup" }),
    });
    expect(response.status).toBe(409);
  });

  it("maps ok to 200", async () => {
    const response = await handleSetupComplete(makeRequest({}), {
      completeSetup: async () => ({ status: "ok" }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });
});
