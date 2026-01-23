import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { WindowControlsProvider } from "@/components/desktop/WindowControlsContext";
import { XpWindow } from "../XpWindow";

describe("xp window", () => {
  it("renders titlebar and window buttons", () => {
    const html = renderToString(
      <WindowControlsProvider
        value={{
          minimize: () => undefined,
          maximize: () => undefined,
          close: () => undefined,
          isMaximized: false,
          isMinimized: false,
        }}
      >
        <XpWindow title="Test Window">
          <div>Body</div>
        </XpWindow>
      </WindowControlsProvider>
    );
    expect(html).toContain("Test Window");
    expect(html).toContain("Свернуть");
    expect(html).toContain("Развернуть");
    expect(html).toContain("Закрыть");
  });
});
