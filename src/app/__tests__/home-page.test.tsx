import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

const getSetupStatus = vi.hoisted(() => vi.fn());
const getSetupRedirect = vi.hoisted(() => vi.fn());
const getServerSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/setupStatus", () => ({ getSetupStatus }));
vi.mock("@/lib/setupRoutes", () => ({ getSetupRedirect }));
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/components/desktop/DesktopClient", () => ({
  default: () => null,
}));
vi.mock("@/lib/auth", () => ({ getAuthOptions: () => ({}) }));

describe("home page setup status", () => {
  it("requests auto-fix when checking setup status", async () => {
    getSetupStatus.mockResolvedValue("ready");
    getSetupRedirect.mockReturnValue(null);
    getServerSession.mockResolvedValue({ user: { email: "ops@local" } });

    const { default: HomePage } = await import("../page");
    const element = await HomePage();
    renderToString(element);

    expect(getSetupStatus).toHaveBeenCalledWith({
      allowAutoDbFix: true,
      allowAutoSslFix: true,
    });
  });
});
