import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import Window from "../Window";
import { useWindowControls } from "../WindowControlsContext";

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
