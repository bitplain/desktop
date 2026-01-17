export type WindowLayout = {
  id: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  zIndex: number;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized?: boolean;
};

const STORAGE_KEY = "desktop.windowLayout";

export function loadWindowLayout(): WindowLayout[] | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as WindowLayout[];
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveWindowLayout(layout: WindowLayout[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

let idleHandle: number | null = null;

function getIdleScheduler() {
  if (typeof window === "undefined") {
    return null;
  }
  const requestIdle = (window as Window & { requestIdleCallback?: (cb: IdleCallback) => number })
    .requestIdleCallback;
  const cancelIdle = (window as Window & { cancelIdleCallback?: (handle: number) => void })
    .cancelIdleCallback;
  return {
    requestIdle:
      requestIdle ??
      ((callback: IdleCallback) =>
        window.setTimeout(
          () => callback({ didTimeout: true, timeRemaining: () => 0 }),
          200
        )),
    cancelIdle: cancelIdle ?? ((handle: number) => window.clearTimeout(handle)),
  };
}

export function saveWindowLayoutIdle(layout: WindowLayout[]) {
  if (typeof window === "undefined") {
    return;
  }
  const scheduler = getIdleScheduler();
  if (!scheduler) {
    return;
  }
  if (idleHandle !== null) {
    scheduler.cancelIdle(idleHandle);
  }
  idleHandle = scheduler.requestIdle(() => {
    saveWindowLayout(layout);
    idleHandle = null;
  });
}

export function cancelSaveWindowLayoutIdle() {
  const scheduler = getIdleScheduler();
  if (!scheduler || idleHandle === null) {
    return;
  }
  scheduler.cancelIdle(idleHandle);
  idleHandle = null;
}

export function shouldPersistLayout(prev: WindowLayout[], next: WindowLayout[]) {
  if (prev.length !== next.length) {
    return true;
  }
  for (let index = 0; index < prev.length; index += 1) {
    const a = prev[index];
    const b = next[index];
    if (a.id !== b.id) {
      return true;
    }
    if (a.zIndex !== b.zIndex) {
      return true;
    }
    if (a.isOpen !== b.isOpen) {
      return true;
    }
    if (a.isMinimized !== b.isMinimized) {
      return true;
    }
    if ((a.isMaximized ?? false) !== (b.isMaximized ?? false)) {
      return true;
    }
    if (a.position.x !== b.position.x || a.position.y !== b.position.y) {
      return true;
    }
    const aSize = a.size;
    const bSize = b.size;
    if (!aSize && !bSize) {
      continue;
    }
    if (!aSize || !bSize) {
      return true;
    }
    if (aSize.width !== bSize.width || aSize.height !== bSize.height) {
      return true;
    }
  }
  return false;
}

export function clearWindowLayout() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function cascadeLayout(ids: string[]) {
  return ids.map((id, index) => ({
    id,
    position: { x: 120 + index * 28, y: 80 + index * 26 },
  }));
}

export function tileLayout(ids: string[], width: number, height: number) {
  if (ids.length === 0) {
    return [];
  }
  const columns = Math.ceil(Math.sqrt(ids.length));
  const rows = Math.ceil(ids.length / columns);
  const gutter = 16;
  const tileWidth = Math.max(260, Math.floor((width - gutter * (columns + 1)) / columns));
  const tileHeight = Math.max(180, Math.floor((height - gutter * (rows + 1)) / rows));

  return ids.map((id, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {
      id,
      position: {
        x: gutter + col * (tileWidth + gutter),
        y: gutter + row * (tileHeight + gutter),
      },
      size: { width: tileWidth, height: tileHeight },
    };
  });
}
