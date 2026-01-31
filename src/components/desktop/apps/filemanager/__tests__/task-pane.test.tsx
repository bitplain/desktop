import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Sidebar } from "../Sidebar";

describe("file manager panes", () => {
  it("renders sidebar sections", () => {
    const html = renderToString(
      <Sidebar
        activeKey="desktop"
        onNavigate={() => undefined}
        onOpenFavorites={() => undefined}
      />
    );
    expect(html).toContain("Desktop");
    expect(html).toContain("Documents");
    expect(html).toContain("Drives");
  });
});
