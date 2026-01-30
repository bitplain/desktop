import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import DesktopIcons from "../DesktopIcons";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("../SettingsProvider", () => ({
  useSettings: () => ({ playSound: vi.fn() }),
}));

describe("desktop icons", () => {
  it("marks eco desktop icons wrapper", () => {
    const html = renderToString(
      <DesktopIcons
        icons={[
          {
            id: "a",
            label: "App",
            variant: "app",
            action: { type: "window", target: "app" },
          },
        ]}
        onOpenWindow={() => undefined}
      />
    );
    expect(html).toContain('data-eco="desktop-icons"');
  });
});
