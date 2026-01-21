import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { TaskPane } from "../TaskPane";
import { IconGrid } from "../IconGrid";

describe("file manager panes", () => {
  it("renders task pane shortcuts", () => {
    const html = renderToString(
      <TaskPane
        view="video"
        loading={false}
        error={null}
        onViewChange={() => undefined}
        onCreateFolder={() => undefined}
        onUpload={() => undefined}
        onDelete={() => undefined}
        selectedLabel={null}
      />
    );
    expect(html).toContain("Избранное");
    expect(html).toContain("Создать новую папку");
  });

  it("renders favorites tile", () => {
    const html = renderToString(
      <IconGrid
        view="video"
        entries={[]}
        favorites={new Set()}
        selectedPath={null}
        onSelect={() => undefined}
        onOpen={() => undefined}
        onToggleFavorite={() => undefined}
        onOpenFavorites={() => undefined}
        onOpenVideo={() => undefined}
      />
    );
    expect(html).toContain("Избранное");
  });
});
