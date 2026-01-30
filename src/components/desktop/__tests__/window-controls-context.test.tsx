import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import Window from "../Window";
import { useWindowControls } from "../WindowControlsContext";

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
  title: "Файловый менеджер",
  onClose: () => undefined,
  onMinimize: () => undefined,
  onMaximize: () => undefined,
  onRestoreFromMaximize: () => undefined,
  onFocus: () => undefined,
  onPositionChange: () => undefined,
  onSizeChange: () => undefined,
};

function Probe() {
  const controls = useWindowControls();
  return <span>{controls ? "ready" : "missing"}</span>;
}

describe("window controls context", () => {
  it("provides controls to children", () => {
    const html = renderToString(
      <Window {...baseProps}>
        <Probe />
      </Window>
    );
    expect(html).toContain("ready");
  });
});
