# Zustand Window Store Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace local window state in `DesktopShell` with a centralized Zustand store to improve scalability and reduce re-renders.

**Architecture:** A single Zustand store manages window state + actions. Components subscribe via selectors. `DesktopShell` initializes the store, wires viewport updates, and triggers layout persistence. Window metadata stays in `DesktopShell`, dynamic window state lives in the store.

**Tech Stack:** React 19, Next.js 16, Zustand 5, TypeScript, Vitest.

---

### Task 1: Add Zustand dependency + store foundation

**Files:**
- Modify: `package.json`
- Create: `src/stores/windowStore.ts`
- Create: `src/stores/__tests__/windowStore.test.ts`

**Step 1: Write the failing test**

```ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/__tests__/windowStore.test.ts`
Expected: FAIL (module `../windowStore` not found or zustand missing).

**Step 3: Add dependency + create the store**

Update `package.json`:

```json
{
  "dependencies": {
    "zustand": "^5.0.8"
  }
}
```

Create `src/stores/windowStore.ts`:

```ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createStore, StateCreator } from "zustand/vanilla";
import { clampWindowBounds } from "@/lib/windowBounds";
import {
  cascadeLayout,
  clearWindowLayout,
  loadWindowLayout,
  saveWindowLayout,
  tileLayout,
  WindowLayout,
} from "@/lib/windowLayouts";

type Position = { x: number; y: number };

type Size = { width: number; height: number };

export type WindowConfig = {
  id: string;
  defaultOpen?: boolean;
};

export type WindowState = {
  id: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: Position;
  size: Size;
  restore?: { position: Position; size: Size };
};

export type Viewport = {
  width: number;
  height: number;
};

type WindowStoreState = {
  windowsById: Record<string, WindowState>;
  order: string[];
  activeId?: string;
  zCounter: number;
  viewport: Viewport;
  initialized: boolean;
  initWindows: (configs: WindowConfig[]) => void;
  setViewport: (viewport: Viewport) => void;
  openWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMinimize: (id: string) => void;
  moveWindow: (id: string, position: Position) => void;
  resizeWindow: (id: string, size: Size) => void;
  toggleMaximize: (id: string) => void;
  restoreFromMaximize: (id: string, position: Position, size: Size) => void;
  cascadeWindows: () => void;
  tileWindows: () => void;
  resetLayout: (configs: WindowConfig[]) => void;
  persistLayout: () => WindowLayout[];
};

const DEFAULT_SIZE = { width: 760, height: 520 };
const OFFSET_X = 40;
const OFFSET_Y = 32;
const TILE_HEIGHT_OFFSET = 76;

const DEFAULT_VIEWPORT: Viewport = { width: 1024, height: 768 };

const getMaximizedBounds = (viewport: Viewport) => ({
  position: { x: 0, y: 0 },
  size: {
    width: Math.max(420, viewport.width),
    height: Math.max(320, viewport.height),
  },
});

const createInitialState = (configs: WindowConfig[]): WindowState[] => {
  return configs.map((config, index) => ({
    id: config.id,
    isOpen: config.defaultOpen ?? false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 10 + index,
    position: {
      x: 120 + index * OFFSET_X,
      y: 80 + index * OFFSET_Y,
    },
    size: DEFAULT_SIZE,
  }));
};

const buildOrder = (windowsById: Record<string, WindowState>) =>
  Object.values(windowsById)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((item) => item.id);

const getActiveId = (windowsById: Record<string, WindowState>) => {
  const open = Object.values(windowsById).filter(
    (item) => item.isOpen && !item.isMinimized
  );
  if (open.length === 0) {
    return undefined;
  }
  return open.reduce((top, item) => (item.zIndex >= top.zIndex ? item : top)).id;
};

const clampRestore = (restore: WindowState["restore"], viewport: Viewport) => {
  if (!restore) {
    return undefined;
  }
  const clamped = clampWindowBounds({
    size: restore.size,
    position: restore.position,
    viewWidth: viewport.width,
    viewHeight: viewport.height,
  });
  return { position: clamped.position, size: clamped.size };
};

const applySavedLayout = (
  base: WindowState[],
  saved: WindowLayout[],
  viewport: Viewport
) => {
  return base.map((item) => {
    const match = saved.find((savedItem) => savedItem.id === item.id);
    if (!match) {
      return item;
    }
    const baseSize = match.size?.width ? match.size : item.size;
    const basePosition = match.position ?? item.position;
    const clamped = clampWindowBounds({
      size: baseSize,
      position: basePosition,
      viewWidth: viewport.width,
      viewHeight: viewport.height,
    });
    const maximizedBounds = match.isMaximized ? getMaximizedBounds(viewport) : null;
    const nextBounds = maximizedBounds ?? clamped;
    return {
      ...item,
      position: nextBounds.position,
      size: nextBounds.size,
      zIndex: match.zIndex,
      isOpen: match.isOpen,
      isMinimized: match.isMinimized,
      isMaximized: match.isMaximized ?? false,
    };
  });
};

const moveToEnd = (order: string[], id: string) => {
  const next = order.filter((item) => item !== id);
  next.push(id);
  return next;
};

const buildLayoutPayload = (windowsById: Record<string, WindowState>) =>
  Object.values(windowsById).map((item) => ({
    id: item.id,
    position: item.position,
    size: item.size,
    zIndex: item.zIndex,
    isOpen: item.isOpen,
    isMinimized: item.isMinimized,
    isMaximized: item.isMaximized,
  }));

const windowStoreCreator: StateCreator<
  WindowStoreState,
  [["zustand/devtools", never]],
  [],
  WindowStoreState
> = (set, get) => ({
  windowsById: {},
  order: [],
  activeId: undefined,
  zCounter: 100,
  viewport: DEFAULT_VIEWPORT,
  initialized: false,
  initWindows: (configs) => {
    set(
      (state) => {
        if (state.initialized) {
          return state;
        }
        const base = createInitialState(configs);
        const saved = loadWindowLayout();
        const hydrated = saved ? applySavedLayout(base, saved, state.viewport) : base;
        const windowsById = Object.fromEntries(
          hydrated.map((item) => [item.id, item])
        );
        const order = buildOrder(windowsById);
        const zCounter = hydrated.reduce(
          (max, item) => Math.max(max, item.zIndex),
          100
        );
        const activeId = getActiveId(windowsById);
        return {
          ...state,
          windowsById,
          order,
          zCounter,
          activeId,
          initialized: true,
        };
      },
      false,
      "windows/init"
    );
  },
  setViewport: (viewport) => {
    set(
      (state) => {
        const nextViewport = {
          width: Math.max(0, viewport.width),
          height: Math.max(0, viewport.height),
        };
        const windowsById = Object.fromEntries(
          Object.values(state.windowsById).map((item) => {
            if (item.isMaximized) {
              const bounds = getMaximizedBounds(nextViewport);
              return [
                item.id,
                {
                  ...item,
                  position: bounds.position,
                  size: bounds.size,
                  restore: clampRestore(item.restore, nextViewport),
                },
              ];
            }
            const clamped = clampWindowBounds({
              size: item.size,
              position: item.position,
              viewWidth: nextViewport.width,
              viewHeight: nextViewport.height,
            });
            return [
              item.id,
              {
                ...item,
                position: clamped.position,
                size: clamped.size,
                restore: clampRestore(item.restore, nextViewport),
              },
            ];
          })
        );
        return {
          ...state,
          viewport: nextViewport,
          windowsById,
          activeId: getActiveId(windowsById),
        };
      },
      false,
      "windows/setViewport"
    );
  },
  openWindow: (id) => {
    set(
      (state) => {
        const target = state.windowsById[id];
        if (!target) {
          return state;
        }
        const zCounter = state.zCounter + 1;
        const windowsById = {
          ...state.windowsById,
          [id]: {
            ...target,
            isOpen: true,
            isMinimized: false,
            zIndex: zCounter,
          },
        };
        return {
          ...state,
          windowsById,
          zCounter,
          order: moveToEnd(state.order, id),
          activeId: id,
        };
      },
      false,
      "windows/open"
    );
  },
  closeWindow: (id) => {
    set(
      (state) => {
        const target = state.windowsById[id];
        if (!target) {
          return state;
        }
        const windowsById = {
          ...state.windowsById,
          [id]: { ...target, isOpen: false, isMinimized: false },
        };
        const activeId =
          state.activeId === id ? getActiveId(windowsById) : state.activeId;
        return { ...state, windowsById, activeId };
      },
      false,
      "windows/close"
    );
  },
  focusWindow: (id) => {
    set(
      (state) => {
        const target = state.windowsById[id];
        if (!target) {
          return state;
        }
        const zCounter = state.zCounter + 1;
        const windowsById = {
          ...state.windowsById,
          [id]: { ...target, isMinimized: false, zIndex: zCounter },
        };
        return {
          ...state,
          windowsById,
          zCounter,
          order: moveToEnd(state.order, id),
          activeId: id,
        };
      },
      false,
      "windows/focus"
    );
  },
  toggleMinimize: (id) => {
    set(
      (state) => {
        const target = state.windowsById[id];
        if (!target) {
          return state;
        }
        if (target.isMinimized) {
          const zCounter = state.zCounter + 1;
          const windowsById = {
            ...state.windowsById,
            [id]: { ...target, isMinimized: false, zIndex: zCounter },
          };
          return {
            ...state,
            windowsById,
            zCounter,
            order: moveToEnd(state.order, id),
            activeId: id,
          };
        }
        const windowsById = {
          ...state.windowsById,
          [id]: { ...target, isMinimized: true },
        };
        const activeId =
          state.activeId === id ? getActiveId(windowsById) : state.activeId;
        return { ...state, windowsById, activeId };
      },
      false,
      "windows/minimize"
    );
  },
  moveWindow: (id, position) => {
    set(
      (state) => {
        const target = state.windowsById[id];
        if (!target || target.isMaximized) {
          return state;
        }
        const clamped = clampWindowBounds({
          size: target.size,
          position,
          viewWidth: state.viewport.width,
          viewHeight: state.viewport.height,
        });
        const windowsById = {
          ...state.windowsById,
          [id]: { ...target, position: clamped.position },
        };
        return { ...state, windowsById };
      },
      false,
      "windows/move"
    );
  },
  resizeWindow: (id, size) => {
    set(
      (state) => {
        const target = state.windowsById[id];
        if (!target || target.isMaximized) {
          return state;
        }
        const clamped = clampWindowBounds({
          size,
          position: target.position,
          viewWidth: state.viewport.width,
          viewHeight: state.viewport.height,
        });
        const windowsById = {
          ...state.windowsById,
          [id]: { ...target, size: clamped.size, position: clamped.position },
        };
        return { ...state, windowsById };
      },
      false,
      "windows/resize"
    );
  },
  toggleMaximize: (id) => {
    set(
      (state) => {
        const target = state.windowsById[id];
        if (!target) {
          return state;
        }
        const zCounter = state.zCounter + 1;
        if (!target.isMaximized) {
          const bounds = getMaximizedBounds(state.viewport);
          const windowsById = {
            ...state.windowsById,
            [id]: {
              ...target,
              isOpen: true,
              isMinimized: false,
              isMaximized: true,
              restore: { position: target.position, size: target.size },
              position: bounds.position,
              size: bounds.size,
              zIndex: zCounter,
            },
          };
          return {
            ...state,
            windowsById,
            zCounter,
            order: moveToEnd(state.order, id),
            activeId: id,
          };
        }
        const fallback = {
          position: { x: 120, y: 80 },
          size: DEFAULT_SIZE,
        };
        const restored = clampWindowBounds({
          size: target.restore?.size ?? fallback.size,
          position: target.restore?.position ?? fallback.position,
          viewWidth: state.viewport.width,
          viewHeight: state.viewport.height,
        });
        const windowsById = {
          ...state.windowsById,
          [id]: {
            ...target,
            isMaximized: false,
            position: restored.position,
            size: restored.size,
            restore: undefined,
            zIndex: zCounter,
          },
        };
        return {
          ...state,
          windowsById,
          zCounter,
          order: moveToEnd(state.order, id),
          activeId: id,
        };
      },
      false,
      "windows/maximize"
    );
  },
  restoreFromMaximize: (id, position, size) => {
    set(
      (state) => {
        const target = state.windowsById[id];
        if (!target) {
          return state;
        }
        const zCounter = state.zCounter + 1;
        const windowsById = {
          ...state.windowsById,
          [id]: {
            ...target,
            isMaximized: false,
            position,
            size,
            restore: undefined,
            zIndex: zCounter,
          },
        };
        return {
          ...state,
          windowsById,
          zCounter,
          order: moveToEnd(state.order, id),
          activeId: id,
        };
      },
      false,
      "windows/restoreFromMaximize"
    );
  },
  cascadeWindows: () => {
    set(
      (state) => {
        const openIds = state.order.filter((id) => state.windowsById[id]?.isOpen);
        const next = cascadeLayout(openIds);
        const windowsById = { ...state.windowsById };
        next.forEach((layout) => {
          const item = windowsById[layout.id];
          if (!item) {
            return;
          }
          const clamped = clampWindowBounds({
            size: item.size,
            position: layout.position,
            viewWidth: state.viewport.width,
            viewHeight: state.viewport.height,
          });
          windowsById[layout.id] = {
            ...item,
            position: clamped.position,
            size: clamped.size,
            isMaximized: false,
            restore: undefined,
          };
        });
        return { ...state, windowsById };
      },
      false,
      "windows/cascade"
    );
  },
  tileWindows: () => {
    set(
      (state) => {
        const openIds = state.order.filter((id) => state.windowsById[id]?.isOpen);
        const tileHeight = Math.max(0, state.viewport.height - TILE_HEIGHT_OFFSET);
        const next = tileLayout(openIds, state.viewport.width, tileHeight);
        const windowsById = { ...state.windowsById };
        next.forEach((layout) => {
          const item = windowsById[layout.id];
          if (!item) {
            return;
          }
          const clamped = clampWindowBounds({
            size: layout.size ?? item.size,
            position: layout.position,
            viewWidth: state.viewport.width,
            viewHeight: state.viewport.height,
          });
          windowsById[layout.id] = {
            ...item,
            position: clamped.position,
            size: clamped.size,
            isMaximized: false,
            restore: undefined,
          };
        });
        return { ...state, windowsById };
      },
      false,
      "windows/tile"
    );
  },
  resetLayout: (configs) => {
    set(
      (state) => {
        clearWindowLayout();
        const base = createInitialState(configs);
        const baseMap = new Map(base.map((item) => [item.id, item]));
        const windowsById = { ...state.windowsById };
        Object.values(windowsById).forEach((item) => {
          const fallback = baseMap.get(item.id);
          if (!fallback) {
            return;
          }
          windowsById[item.id] = {
            ...item,
            position: fallback.position,
            size: fallback.size,
            zIndex: fallback.zIndex,
            isMaximized: false,
            restore: undefined,
          };
        });
        const order = buildOrder(windowsById);
        const zCounter = Object.values(windowsById).reduce(
          (max, item) => Math.max(max, item.zIndex),
          100
        );
        return {
          ...state,
          windowsById,
          order,
          zCounter,
          activeId: getActiveId(windowsById),
        };
      },
      false,
      "windows/reset"
    );
  },
  persistLayout: () => {
    const payload = buildLayoutPayload(get().windowsById);
    saveWindowLayout(payload);
    return payload;
  },
});

export const useWindowStore = create<WindowStoreState>()(
  devtools(windowStoreCreator, { name: "window-store" })
);

export const createWindowStore = () =>
  createStore<WindowStoreState>()(devtools(windowStoreCreator, { name: "window-store" }));

export const selectOpenWindowIds = (state: WindowStoreState) =>
  state.order.filter((id) => state.windowsById[id]?.isOpen);
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/stores/__tests__/windowStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json src/stores/windowStore.ts src/stores/__tests__/windowStore.test.ts

git commit -m "feat: add zustand window store foundation"
```

---

### Task 2: Add tests for minimize/maximize/restore and viewport clamping

**Files:**
- Modify: `src/stores/__tests__/windowStore.test.ts`
- Modify: `src/stores/windowStore.ts`

**Step 1: Extend tests (failing first)**

```ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/__tests__/windowStore.test.ts`
Expected: FAIL for missing behavior.

**Step 3: Update store if needed**

If tests fail, adjust the relevant actions in `src/stores/windowStore.ts` (likely `toggleMinimize`, `toggleMaximize`, or `setViewport`) to satisfy the expectations.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/stores/__tests__/windowStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/windowStore.ts src/stores/__tests__/windowStore.test.ts

git commit -m "test: cover minimize maximize and viewport clamp"
```

---

### Task 3: Add layout/reset tests

**Files:**
- Modify: `src/stores/__tests__/windowStore.test.ts`
- Modify: `src/stores/windowStore.ts`

**Step 1: Extend tests (failing first)**

```ts
import { cascadeLayout, tileLayout } from "@/lib/windowLayouts";

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

  expect(beta.size).toEqual(
    expectedTiles.find((item) => item.id === "beta")?.size
  );

  store.getState().moveWindow("beta", { x: 500, y: 500 });
  store.getState().resetLayout(configs);

  const resetBeta = store.getState().windowsById.beta;
  expect(resetBeta.position).toEqual({ x: 160, y: 112 });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/__tests__/windowStore.test.ts`
Expected: FAIL for missing behavior.

**Step 3: Update store if needed**

Ensure `cascadeWindows`, `tileWindows`, and `resetLayout` match the expected layout behaviors.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/stores/__tests__/windowStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/windowStore.ts src/stores/__tests__/windowStore.test.ts

git commit -m "test: cover layout actions and reset"
```

---

### Task 4: Wire `DesktopShell` to the store

**Files:**
- Modify: `src/components/desktop/DesktopShell.tsx`

**Step 1: Update imports and store wiring**

Replace the window state hooks with store selectors/actions:

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWindowStore, selectOpenWindowIds } from "@/stores/windowStore";
```

**Step 2: Replace local window state with store usage**

Add store hooks near the top of `DesktopShell`:

```ts
  const {
    windowsById,
    activeId,
    initialized,
    initWindows,
    setViewport,
    openWindow,
    closeWindow,
    focusWindow,
    toggleMinimize,
    toggleMaximize,
    restoreFromMaximize,
    moveWindow,
    resizeWindow,
    cascadeWindows,
    tileWindows,
    resetLayout,
    persistLayout,
  } = useWindowStore(
    useShallow((state) => ({
      windowsById: state.windowsById,
      activeId: state.activeId,
      initialized: state.initialized,
      initWindows: state.initWindows,
      setViewport: state.setViewport,
      openWindow: state.openWindow,
      closeWindow: state.closeWindow,
      focusWindow: state.focusWindow,
      toggleMinimize: state.toggleMinimize,
      toggleMaximize: state.toggleMaximize,
      restoreFromMaximize: state.restoreFromMaximize,
      moveWindow: state.moveWindow,
      resizeWindow: state.resizeWindow,
      cascadeWindows: state.cascadeWindows,
      tileWindows: state.tileWindows,
      resetLayout: state.resetLayout,
      persistLayout: state.persistLayout,
    }))
  );

  const openIds = useWindowStore(selectOpenWindowIds);
```

**Step 3: Initialize store and viewport**

Add store init and viewport effects:

```ts
  const storeConfigs = useMemo(
    () => windowConfigs.map(({ id, defaultOpen }) => ({ id, defaultOpen })),
    [windowConfigs]
  );

  useEffect(() => {
    initWindows(storeConfigs);
  }, [initWindows, storeConfigs]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const updateViewport = () =>
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight - TASKBAR_HEIGHT,
      });
    const handleResize = debounce(updateViewport, 120);
    window.addEventListener("resize", handleResize);
    updateViewport();
    return () => {
      window.removeEventListener("resize", handleResize);
      handleResize.cancel();
    };
  }, [setViewport]);

  const saveLayout = useMemo(() => debounce(persistLayout, 250), [persistLayout]);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    saveLayout();
    return () => saveLayout.cancel();
  }, [initialized, saveLayout, windowsById]);
```

**Step 4: Wrap store actions with sounds**

```ts
  const handleOpenWindow = useCallback(
    (id: string) => {
      playSound("notify");
      openWindow(id);
    },
    [openWindow, playSound]
  );

  const handleCloseWindow = useCallback(
    (id: string) => {
      playSound("click");
      closeWindow(id);
    },
    [closeWindow, playSound]
  );

  const handleToggleMinimize = useCallback(
    (id: string) => {
      const target = useWindowStore.getState().windowsById[id];
      playSound(target?.isMinimized ? "restore" : "minimize");
      toggleMinimize(id);
    },
    [toggleMinimize, playSound]
  );

  const handleToggleMaximize = useCallback(
    (id: string) => {
      playSound("restore");
      toggleMaximize(id);
    },
    [toggleMaximize, playSound]
  );

  const handleResetLayout = useCallback(() => {
    playSound("click");
    resetLayout(storeConfigs);
  }, [playSound, resetLayout, storeConfigs]);
```

**Step 5: Replace prop usage**

- Use `openIds` and `windowsById` to render windows and taskbar entries.
- Replace `openWindow`/`closeWindow`/etc with the new handlers.
- Remove local `windows`, `zCounter`, `loadWindowLayout`, `saveWindowLayout` usage.

Example for rendering windows:

```tsx
      <div className="desktop-windows">
        {openIds.map((id) => {
          const config = windowConfigs.find((item) => item.id === id);
          if (!config) {
            return null;
          }
          return (
            <Window
              key={id}
              id={id}
              title={config.title}
              subtitle={config.subtitle}
              icon={config.icon}
              canClose={config.canClose}
              onClose={handleCloseWindow}
              onMinimize={handleToggleMinimize}
              onMaximize={handleToggleMaximize}
              onRestoreFromMaximize={restoreFromMaximize}
              onFocus={focusWindow}
              onPositionChange={moveWindow}
              onSizeChange={resizeWindow}
            >
              {config.content}
            </Window>
          );
        })}
      </div>
```

Update desktop entry points and taskbar:

```tsx
      <DesktopIcons icons={icons} onOpenWindow={handleOpenWindow} />

      <Taskbar
        windows={openIds
          .map((id) => {
            const config = windowConfigs.find((item) => item.id === id);
            const state = windowsById[id];
            if (!config || !state) {
              return null;
            }
            return {
              id,
              title: config.title,
              isMinimized: state.isMinimized,
              icon: config.icon,
            };
          })
          .filter(Boolean)}
        activeId={activeId}
        startOpen={startOpen}
        onToggleStart={() => setStartOpen((prev) => !prev)}
        onToggleWindow={handleToggleMinimize}
        onCascade={cascadeWindows}
        onTile={tileWindows}
        userEmail={userEmail ?? undefined}
        onOpenAccount={accountModule ? () => handleOpenWindow(accountModule.id) : undefined}
      />
```

**Step 6: Run tests**

Run: `npm test`
Expected: PASS

**Step 7: Commit**

```bash
git add src/components/desktop/DesktopShell.tsx

git commit -m "refactor: wire desktop shell to window store"
```

---

### Task 5: Update `Window` component to read state from store

**Files:**
- Modify: `src/components/desktop/Window.tsx`

**Step 1: Update props and select state from store**

Add store import and remove window state props:

```ts
import { useWindowStore } from "@/stores/windowStore";
```

Update `WindowProps` to remove `isMinimized`, `isMaximized`, `restore`, `zIndex`, `position`, `size` fields.

Then inside `Window`:

```ts
  const windowState = useWindowStore((state) => state.windowsById[id]);

  if (!windowState) {
    return null;
  }

  const { isMinimized, isMaximized, restore, zIndex, position, size } = windowState;
```

**Step 2: Ensure actions are still passed via props**

Keep using `onClose`, `onMinimize`, `onMaximize`, `onRestoreFromMaximize`, `onFocus`, `onPositionChange`, and `onSizeChange` so sound hooks remain in `DesktopShell`.

**Step 3: Run tests**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/desktop/Window.tsx

git commit -m "refactor: window reads state from zustand"
```

---

### Task 6: Final verification

**Files:**
- None (verification only)

**Step 1: Run full test suite**

Run: `npm test`
Expected: PASS

**Step 2: Optional lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit any cleanups**

```bash
git status --short
```

If there are changes, stage and commit with a scoped message.
