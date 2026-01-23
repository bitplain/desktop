import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import AccountApp from "../AccountApp";
import SystemApp from "../SystemApp";

vi.mock("@/components/desktop/SettingsProvider", () => ({
  useSettings: () => ({
    playSound: vi.fn(),
  }),
}));

describe("account and system apps", () => {
  it("renders eco form and panel styles", () => {
    const accountHtml = renderToString(<AccountApp email="user@test.dev" />);
    expect(accountHtml).toContain("eco-form");
    expect(accountHtml).toContain("eco-panel");
  });

  it("renders eco panel for system app", () => {
    const systemHtml = renderToString(<SystemApp title="System" message="All good" />);
    expect(systemHtml).toContain("eco-panel");
  });
});
