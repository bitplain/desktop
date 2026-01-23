import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { XpChrome } from "../XpChrome";

describe("xp chrome", () => {
  it("renders left and right panes", () => {
    const html = renderToString(
      <XpChrome left={<div>Left Pane</div>}>
        <div>Right Pane</div>
      </XpChrome>
    );
    expect(html).toContain("Left Pane");
    expect(html).toContain("Right Pane");
    expect(html).toContain("eco-chrome");
  });
});
