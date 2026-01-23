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
