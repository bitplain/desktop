import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

vi.mock("@/components/desktop/SettingsProvider", () => ({
  useSettings: () => ({
    playSound: vi.fn(),
  }),
}));

vi.mock("@/hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => true,
}));

vi.mock("@/lib/setupRoutes", () => ({
  getSetupRedirect: () => null,
}));

describe("auth screens", () => {
  it("renders eco calm login shell", () => {
    const html = renderToString(<LoginPage />);
    expect(html).toContain("auth-shell");
    expect(html).toContain("auth-card");
  });

  it("renders eco calm register shell", () => {
    const html = renderToString(<RegisterPage />);
    expect(html).toContain("auth-shell");
    expect(html).toContain("auth-card");
  });
});
