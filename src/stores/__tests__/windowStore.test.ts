import { describe, expect, it } from "vitest";
import { clampWindowBounds } from "@/lib/windowBounds";
import { cascadeLayout, tileLayout } from "@/lib/windowLayouts";
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

  it("uses custom default size when provided", () => {
    const store = createWindowStore();
    store.getState().setViewport({ width: 1400, height: 900 });
    store.getState().initWindows([
      { id: "video", defaultOpen: true, defaultSize: { width: 420, height: 860 } },
    ]);

    const video = store.getState().windowsById.video;
    expect(video.size).toEqual({ width: 420, height: 860 });
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

  it("minimizes and restores a window", () => {
    const store = createWindowStore();
    store.getState().setViewport({ width: 1400, height: 900 });
    store.getState().initWindows(configs);

    store.getState().openWindow("beta");
    store.getState().toggleMinimize("beta");

    expect(store.getState().windowsById.beta.isMinimized).toBe(true);

    store.getState().toggleMinimize("beta");

    expect(store.getState().windowsById.beta.isMinimized).toBe(false);
    expect(store.getState().activeId).toBe("beta");
  });

  it("maximizes and restores a window", () => {
    const store = createWindowStore();
    store.getState().setViewport({ width: 1200, height: 800 });
    store.getState().initWindows(configs);

    store.getState().toggleMaximize("alpha");
    const maximized = store.getState().windowsById.alpha;

    expect(maximized.isMaximized).toBe(true);
    expect(maximized.size).toEqual({ width: 1200, height: 800 });
    expect(maximized.restore?.size).toEqual({ width: 760, height: 520 });

    store.getState().toggleMaximize("alpha");
    const restored = store.getState().windowsById.alpha;

    expect(restored.isMaximized).toBe(false);
    expect(restored.size).toEqual({ width: 760, height: 520 });
  });

  it("clamps windows on viewport updates", () => {
    const store = createWindowStore();
    store.getState().setViewport({ width: 1400, height: 900 });
    store.getState().initWindows(configs);

    store.getState().resizeWindow("alpha", { width: 2000, height: 1600 });
    store.getState().setViewport({ width: 600, height: 400 });

    const { size } = store.getState().windowsById.alpha;
    expect(size.width).toBeLessThanOrEqual(600);
    expect(size.height).toBeLessThanOrEqual(400);
  });

  it("applies cascade layout to open windows", () => {
    const store = createWindowStore();
    store.getState().setViewport({ width: 1400, height: 900 });
    store.getState().initWindows(configs);
    store.getState().openWindow("beta");

    store.getState().cascadeWindows();

    const openIds = store.getState().order.filter(
      (id) => store.getState().windowsById[id]?.isOpen
    );
    const expected = cascadeLayout(openIds);
    const alpha = store.getState().windowsById.alpha;

    expect(alpha.position).toEqual(expected.find((item) => item.id === "alpha")?.position);
    expect(alpha.isMaximized).toBe(false);
  });

  it("applies tile layout and resets layout", () => {
    const store = createWindowStore();
    store.getState().setViewport({ width: 1000, height: 700 });
    store.getState().initWindows(configs);
    store.getState().openWindow("beta");

    store.getState().tileWindows();
    const openIds = store.getState().order.filter(
      (id) => store.getState().windowsById[id]?.isOpen
    );
    const expectedTiles = tileLayout(openIds, 1000, 700 - 76);
    const beta = store.getState().windowsById.beta;

    const expectedBeta = expectedTiles.find((item) => item.id === "beta");
    if (!expectedBeta) {
      throw new Error("Missing tile layout for beta");
    }
    const clampedBeta = clampWindowBounds({
      size: expectedBeta.size ?? beta.size,
      position: expectedBeta.position,
      viewWidth: 1000,
      viewHeight: 700,
    });

    expect(beta.size).toEqual(clampedBeta.size);

    store.getState().moveWindow("beta", { x: 500, y: 500 });
    store.getState().resetLayout(configs);

    const resetBeta = store.getState().windowsById.beta;
    expect(resetBeta.position).toEqual({ x: 160, y: 112 });
  });
});
