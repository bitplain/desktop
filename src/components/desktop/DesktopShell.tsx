"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "./SettingsProvider";
import DesktopIcons, { DesktopIcon } from "./DesktopIcons";
import StartMenu, { StartMenuItem } from "./StartMenu";
import Taskbar from "./Taskbar";
import Window from "./Window";
import OfflineBanner from "@/components/OfflineBanner";
import {
  cascadeLayout,
  clearWindowLayout,
  loadWindowLayout,
  saveWindowLayout,
  tileLayout,
} from "@/lib/windowLayouts";
import { debounce } from "@/lib/debounce";
import { clampWindowBounds } from "@/lib/windowBounds";
import type { ModuleManifest } from "@/modules/types";

type WindowConfig = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  Window: ModuleManifest["Window"];
  defaultOpen?: boolean;
  canClose?: boolean;
};

type WindowState = {
  id: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  restore?: { position: { x: number; y: number }; size: { width: number; height: number } };
};

const OFFSET_X = 40;
const OFFSET_Y = 32;
const TASKBAR_HEIGHT = 44;
function getMaximizedBounds() {
  if (typeof window === "undefined") {
    return {
      position: { x: 0, y: 0 },
      size: { width: 760, height: 520 },
    };
  }
  const width = Math.max(420, window.innerWidth);
  const height = Math.max(320, window.innerHeight - TASKBAR_HEIGHT);
  return {
    position: { x: 0, y: 0 },
    size: { width, height },
  };
}

function createInitialState(configs: WindowConfig[]): WindowState[] {
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
    size: { width: 760, height: 520 },
  }));
}

export default function DesktopShell({
  modules,
  userEmail,
}: {
  modules: ModuleManifest[];
  userEmail?: string | null;
}) {
  const { playSound } = useSettings();
  const [startOpen, setStartOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });
  const zCounter = useRef(100);
  const saveLayout = useMemo(() => debounce(saveWindowLayout, 250), []);

  const windowConfigs = useMemo<WindowConfig[]>(() => {
    return modules.map((module) => ({
      id: module.id,
      title: module.title,
      subtitle: module.subtitle,
      icon: module.icon,
      Window: module.Window,
      defaultOpen: module.defaultOpen ?? false,
      canClose: true,
    }));
  }, [modules, userEmail]);

  const [windows, setWindows] = useState<WindowState[]>(() => {
    const base = createInitialState(windowConfigs);
    const saved = loadWindowLayout();
    if (!saved) {
      return base;
    }
    const viewWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const viewHeight =
      typeof window !== "undefined" ? window.innerHeight - TASKBAR_HEIGHT : 768;
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
        viewWidth,
        viewHeight,
      });
      const maximizedBounds = match.isMaximized ? getMaximizedBounds() : null;
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
  });

  useEffect(() => {
    const maxZ = windows.reduce((max, item) => Math.max(max, item.zIndex), 100);
    zCounter.current = maxZ;
  }, [windows]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleResize = () => {
      const viewWidth = window.innerWidth;
      const viewHeight = window.innerHeight - TASKBAR_HEIGHT;
      setWindows((prev) =>
        prev.map((item) => {
          const restore = item.restore
            ? clampWindowBounds({
                size: item.restore.size,
                position: item.restore.position,
                viewWidth,
                viewHeight,
              })
            : undefined;
          if (item.isMaximized) {
            const bounds = getMaximizedBounds();
            return {
              ...item,
              position: bounds.position,
              size: bounds.size,
              restore: restore ? { position: restore.position, size: restore.size } : item.restore,
            };
          }
          const clamped = clampWindowBounds({
            size: item.size,
            position: item.position,
            viewWidth,
            viewHeight,
          });
          return {
            ...item,
            position: clamped.position,
            size: clamped.size,
            restore: restore ? { position: restore.position, size: restore.size } : item.restore,
          };
        })
      );
    };
    const handleResizeDebounced = debounce(handleResize, 120);
    window.addEventListener("resize", handleResizeDebounced);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResizeDebounced);
      handleResizeDebounced.cancel();
    };
  }, []);

  const windowsMap = useMemo(() => {
    const map = new Map<string, WindowState>();
    windows.forEach((item) => map.set(item.id, item));
    return map;
  }, [windows]);

  const openWindow = (id: string) => {
    playSound("notify");
    setWindows((prev) => {
      const exists = prev.some((item) => item.id === id);
      if (!exists) {
        return prev;
      }
      return prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isOpen: true,
              isMinimized: false,
              zIndex: ++zCounter.current,
            }
          : item
      );
    });
  };

  const closeWindow = (id: string) => {
    playSound("click");
    setWindows((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isOpen: false, isMinimized: false } : item
      )
    );
  };

  const toggleMinimize = (id: string) => {
    setWindows((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        playSound(item.isMinimized ? "restore" : "minimize");
        return {
          ...item,
          isMinimized: !item.isMinimized,
          zIndex: item.isMinimized ? ++zCounter.current : item.zIndex,
        };
      })
    );
  };

  const focusWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isMinimized: false, zIndex: ++zCounter.current }
          : item
      )
    );
  };

  const updatePosition = (id: string, position: { x: number; y: number }) => {
    setWindows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, position } : item))
    );
  };

  const updateSize = (id: string, size: { width: number; height: number }) => {
    setWindows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, size } : item))
    );
  };

  const toggleMaximize = (id: string) => {
    playSound("restore");
    setWindows((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        if (!item.isMaximized) {
          const bounds = getMaximizedBounds();
          return {
            ...item,
            isOpen: true,
            isMinimized: false,
            isMaximized: true,
            restore: { position: item.position, size: item.size },
            position: bounds.position,
            size: bounds.size,
            zIndex: ++zCounter.current,
          };
        }
        const fallback = {
          position: { x: 120, y: 80 },
          size: { width: 760, height: 520 },
        };
        const viewWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
        const viewHeight =
          typeof window !== "undefined" ? window.innerHeight - TASKBAR_HEIGHT : 768;
        const restored = clampWindowBounds({
          size: item.restore?.size ?? fallback.size,
          position: item.restore?.position ?? fallback.position,
          viewWidth,
          viewHeight,
        });
        return {
          ...item,
          isMaximized: false,
          position: restored.position,
          size: restored.size,
          restore: undefined,
          zIndex: ++zCounter.current,
        };
      })
    );
  };

  useEffect(() => {
    const payload = windows.map((item) => ({
      id: item.id,
      position: item.position,
      size: item.size,
      zIndex: item.zIndex,
      isOpen: item.isOpen,
      isMinimized: item.isMinimized,
      isMaximized: item.isMaximized,
    }));
    saveLayout(payload);
    return () => saveLayout.cancel();
  }, [saveLayout, windows]);

  const cascadeWindows = () => {
    const openIds = windows.filter((item) => item.isOpen).map((item) => item.id);
    const next = cascadeLayout(openIds);
    const viewWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const viewHeight =
      typeof window !== "undefined" ? window.innerHeight - TASKBAR_HEIGHT : 768;
    setWindows((prev) =>
      prev.map((item) => {
        const found = next.find((layout) => layout.id === item.id);
        if (!found) {
          return item;
        }
        const clamped = clampWindowBounds({
          size: item.size,
          position: found.position,
          viewWidth,
          viewHeight,
        });
        return {
          ...item,
          position: clamped.position,
          size: clamped.size,
          isMaximized: false,
          restore: undefined,
        };
      })
    );
  };

  const resetWindowLayout = () => {
    playSound("click");
    clearWindowLayout();
    setWindows((prev) => {
      const base = createInitialState(windowConfigs);
      const baseMap = new Map(base.map((item) => [item.id, item]));
      const next = prev.map((item) => {
        const fallback = baseMap.get(item.id);
        if (!fallback) {
          return item;
        }
        return {
          ...item,
          position: fallback.position,
          size: fallback.size,
          zIndex: fallback.zIndex,
          isMaximized: false,
          restore: undefined,
        };
      });
      const maxZ = next.reduce((max, item) => Math.max(max, item.zIndex), 100);
      zCounter.current = maxZ;
      return next;
    });
  };

  const tileWindows = () => {
    const openIds = windows.filter((item) => item.isOpen).map((item) => item.id);
    const next = tileLayout(openIds, window.innerWidth, window.innerHeight - 120);
    const viewWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const viewHeight =
      typeof window !== "undefined" ? window.innerHeight - TASKBAR_HEIGHT : 768;
    setWindows((prev) =>
      prev.map((item) => {
        const found = next.find((layout) => layout.id === item.id);
        if (!found) {
          return item;
        }
        const clamped = clampWindowBounds({
          size: found.size ?? item.size,
          position: found.position,
          viewWidth,
          viewHeight,
        });
        return {
          ...item,
          position: clamped.position,
          size: clamped.size,
          isMaximized: false,
          restore: undefined,
        };
      })
    );
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (
      target.closest(".window") ||
      target.closest(".taskbar") ||
      target.closest(".start-menu")
    ) {
      return;
    }
    event.preventDefault();
    setContextMenu({ open: true, x: event.clientX, y: event.clientY });
  };

  const openWindows = windowConfigs.filter((config) => {
    const state = windowsMap.get(config.id);
    return state?.isOpen;
  });

  const activeOpen = windows.filter((item) => item.isOpen && !item.isMinimized);
  const activeId = activeOpen.length
    ? activeOpen.reduce((top, item) => (item.zIndex >= top.zIndex ? item : top))
        .id
    : undefined;

  const orderedModules = useMemo(() => {
    const order = ["notepad", "calculator", "clock", "system", "account", "about"];
    const map = new Map(modules.map((module) => [module.id, module]));
    const ordered = order
      .map((id) => map.get(id))
      .filter((module): module is ModuleManifest => Boolean(module));
    const remaining = modules.filter((module) => !order.includes(module.id));
    return [...ordered, ...remaining];
  }, [modules]);

  const startMenuModules = orderedModules.filter((module) => module.startMenu ?? true);
  const desktopModules = orderedModules.filter((module) => module.desktopIcon ?? true);

  const toStartItem = (module: ModuleManifest, prefix: string): StartMenuItem => ({
    id: `${prefix}-${module.id}`,
    label: module.title,
    description: module.subtitle,
    icon: module.icon,
    action: { type: "window", target: module.id },
  });

  const icons: DesktopIcon[] = desktopModules.map((module) => ({
    id: `desktop-${module.id}`,
    label: module.title,
    variant: "app",
    icon: module.icon,
    action: { type: "window", target: module.id },
  }));

  const startLeft: StartMenuItem[] = startMenuModules
    .slice(0, 4)
    .map((module) => toStartItem(module, "start"));
  const startRight: StartMenuItem[] = startMenuModules
    .slice(4)
    .map((module) => toStartItem(module, "start"));
  const programItems: StartMenuItem[] = startMenuModules.map((module) =>
    toStartItem(module, "program")
  );

  const contextModules = startMenuModules.slice(0, 3);
  const accountModule = startMenuModules.find((module) => module.id === "account");

  return (
    <div
      className="desktop-root"
      onClick={() => {
        setStartOpen(false);
        setContextMenu((prev) => ({ ...prev, open: false }));
      }}
      onContextMenu={handleContextMenu}
    >
      <div className="desktop-wallpaper" aria-hidden />
      <OfflineBanner />
      <DesktopIcons icons={icons} onOpenWindow={openWindow} />
      <div className="desktop-windows">
        {openWindows.map((config) => {
          const state = windowsMap.get(config.id);
          if (!state) {
            return null;
          }
          return (
            <Window
              key={config.id}
              id={config.id}
              title={config.title}
              subtitle={config.subtitle}
              icon={config.icon}
              isMinimized={state.isMinimized}
              isMaximized={state.isMaximized}
              restore={state.restore}
              zIndex={state.zIndex}
              position={state.position}
              size={state.size}
              canClose={config.canClose}
              onClose={closeWindow}
              onMinimize={toggleMinimize}
              onMaximize={toggleMaximize}
              onRestoreFromMaximize={(id, position, size) => {
                setWindows((prev) =>
                  prev.map((item) =>
                    item.id === id
                      ? {
                          ...item,
                          isMaximized: false,
                          position,
                          size,
                          restore: undefined,
                          zIndex: ++zCounter.current,
                        }
                      : item
                  )
                );
              }}
              onFocus={focusWindow}
              onPositionChange={updatePosition}
              onSizeChange={updateSize}
            >
              <config.Window
                userEmail={userEmail}
                openWindow={openWindow}
                closeWindow={closeWindow}
              />
            </Window>
          );
        })}
      </div>
      {contextMenu.open ? (
        <div
          className="desktop-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="desktop-menu-item"
            type="button"
            onClick={() => {
              playSound("click");
              cascadeWindows();
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Cascade Windows
          </button>
          <button
            className="desktop-menu-item"
            type="button"
            onClick={() => {
              playSound("click");
              tileWindows();
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Tile Windows
          </button>
          <button
            className="desktop-menu-item"
            type="button"
            onClick={() => {
              resetWindowLayout();
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Сбросить раскладку
          </button>
          <div className="desktop-menu-divider" />
          {contextModules.map((module) => (
            <button
              key={module.id}
              className="desktop-menu-item"
              type="button"
              onClick={() => {
                playSound("click");
                openWindow(module.id);
                setContextMenu((prev) => ({ ...prev, open: false }));
              }}
            >
              {module.title}
            </button>
          ))}
        </div>
      ) : null}
      <StartMenu
        key={startOpen ? "open" : "closed"}
        open={startOpen}
        leftItems={startLeft}
        rightItems={startRight}
        programItems={programItems}
        onCascade={cascadeWindows}
        onTile={tileWindows}
        onClose={() => setStartOpen(false)}
        onOpenWindow={openWindow}
        userEmail={userEmail}
      />
      <Taskbar
        windows={openWindows.map((config) => {
          const state = windowsMap.get(config.id)!;
          return {
            id: config.id,
            title: config.title,
            isMinimized: state.isMinimized,
            icon: config.icon,
          };
        })}
        activeId={activeId}
        startOpen={startOpen}
        onToggleStart={() => setStartOpen((prev) => !prev)}
        onToggleWindow={toggleMinimize}
        onCascade={cascadeWindows}
        onTile={tileWindows}
        userEmail={userEmail ?? undefined}
        onOpenAccount={accountModule ? () => openWindow(accountModule.id) : undefined}
      />
    </div>
  );
}
