import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import Window from "../Window";

vi.mock("@/stores/windowStore", () => {
  const windowState = {
    id: "filemanager",
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: 10,
    position: { x: 0, y: 0 },
    size: { width: 600, height: 400 },
  };
  const useWindowStore = (selector: (state: { windowsById: Record<string, unknown> }) => unknown) =>
    selector({ windowsById: { [windowState.id]: windowState } });
  useWindowStore.getState = () => ({
    windowsById: { [windowState.id]: windowState },
  });
  return { useWindowStore };
});

const baseProps = {
  id: "filemanager",
  title: "File Manager",
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
  it("renders eco calm chrome classes", () => {
    const html = renderToString(<Window {...baseProps} />);
    expect(html).toContain("eco-window");
    expect(html).toContain("eco-window__header");
    expect(html).toContain('data-eco="window"');
  });

  it("omits chrome when hideChrome is true", () => {
    const html = renderToString(<Window {...baseProps} hideChrome />);
    expect(html).toContain("window--chromeless");
    expect(html).not.toContain("window-header");
  });
});
