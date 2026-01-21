import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import Window from "../Window";

const baseProps = {
  id: "filemanager",
  title: "File Manager",
  isMinimized: false,
  isMaximized: false,
  zIndex: 10,
  position: { x: 0, y: 0 },
  size: { width: 600, height: 400 },
  onClose: () => undefined,
  onMinimize: () => undefined,
  onMaximize: () => undefined,
  onRestoreFromMaximize: () => undefined,
  onFocus: () => undefined,
  onPositionChange: () => undefined,
  onSizeChange: () => undefined,
  children: <div>Inner</div>,
};

describe("window chrome", () => {
  it("omits chrome when hideChrome is true", () => {
    const html = renderToString(<Window {...baseProps} hideChrome />);
    expect(html).toContain("window--chromeless");
    expect(html).not.toContain("window-header");
  });
});
