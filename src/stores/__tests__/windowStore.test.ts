import { describe, expect, it } from "vitest";
import { createWindowStore } from "../windowStore";

const configs = [
  { id: "alpha", defaultOpen: true },
  { id: "beta" },
];

describe("window store", () => {
  it("initializes windows with defaults", () => {
    const store = createWindowStore();
    store.getState().setViewport({ width: 1400, height: 900 });
    store.getState().initWindows(configs);

    const { windowsById, order, activeId } = store.getState();

    expect(Object.keys(windowsById).sort()).toEqual(["alpha", "beta"]);
    expect(order).toEqual(["alpha", "beta"]);
    expect(activeId).toBe("alpha");

    const alpha = windowsById.alpha;
    expect(alpha.isOpen).toBe(true);
    expect(alpha.isMinimized).toBe(false);
    expect(alpha.isMaximized).toBe(false);
    expect(alpha.position).toEqual({ x: 120, y: 80 });
    expect(alpha.size).toEqual({ width: 760, height: 520 });
  });

  it("opens windows and brings them to front", () => {
    const store = createWindowStore();
    store.getState().setViewport({ width: 1400, height: 900 });
    store.getState().initWindows(configs);

    store.getState().openWindow("beta");
    const { windowsById, order, activeId } = store.getState();

    expect(windowsById.beta.isOpen).toBe(true);
    expect(activeId).toBe("beta");
    expect(order[order.length - 1]).toBe("beta");
  });
});
