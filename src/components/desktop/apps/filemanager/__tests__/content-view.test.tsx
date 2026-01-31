import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { ContentView } from "../ContentView";

describe("content view", () => {
  it("renders entries in grid mode", () => {
    const html = renderToString(
      <ContentView
        entries={[{ type: "folder", name: "video", path: "video" }]}
        favorites={new Set()}
        selectedPath={null}
        layout="grid"
        onSelect={() => undefined}
        onOpen={() => undefined}
        onToggleFavorite={() => undefined}
      />
    );
    expect(html).toContain("video");
  });
});
