import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import Taskbar from "../Taskbar";

vi.mock("../SettingsProvider", () => ({
  useSettings: () => ({
    playSound: vi.fn(),
  }),
}));

describe("taskbar", () => {
  it("renders start button and tray", () => {
    const html = renderToString(
      <Taskbar
        windows={[]}
        startOpen={false}
        onToggleStart={() => undefined}
        onActivateWindow={() => undefined}
      />
    );
    expect(html).toContain("start-button");
    expect(html).toContain("taskbar-tray");
  });
});
