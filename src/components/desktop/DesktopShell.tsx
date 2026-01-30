"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSettings } from "./SettingsProvider";
import DesktopIcons, { DesktopIcon } from "./DesktopIcons";
import StartMenu, { StartMenuItem } from "./StartMenu";
import Taskbar, { type TaskbarWindow } from "./Taskbar";
import Window from "./Window";
import OfflineBanner from "@/components/OfflineBanner";
import { debounce } from "@/lib/debounce";
import { selectOpenWindowIds, useWindowStore } from "@/stores/windowStore";
import type { ModuleManifest } from "@/modules/types";
import { EcoMenu, EcoMenuItem } from "@/components/ui/eco";

type WindowConfig = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  Window: ModuleManifest["Window"];
  defaultOpen?: boolean;
  defaultSize?: { width: number; height: number };
  canClose?: boolean;
  window?: ModuleManifest["window"];
};

const TASKBAR_HEIGHT = 34;

export default function DesktopShell({
  modules,
  userEmail,
}: {
  modules: ModuleManifest[];
  userEmail?: string | null;
}) {
  const { playSound } = useSettings();
  const [startOpen, setStartOpen] = useState(false);
  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousStartOpen = useRef(false);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });
  const windowConfigs = useMemo<WindowConfig[]>(() => {
    return modules.map((module) => ({
      id: module.id,
      title: module.title,
      subtitle: module.subtitle,
      icon: module.icon,
      Window: module.Window,
      defaultOpen: module.defaultOpen ?? false,
      defaultSize: module.window?.defaultSize,
      canClose: true,
      window: module.window,
    }));
  }, [modules, userEmail]);

  const storeConfigs = useMemo(
    () =>
      windowConfigs.map(({ id, defaultOpen, defaultSize }) => ({
        id,
        defaultOpen,
        defaultSize,
      })),
    [windowConfigs]
  );

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

  const openIds = useWindowStore(useShallow(selectOpenWindowIds));

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

  useEffect(() => {
    if (!startOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      setStartOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startOpen]);

  useEffect(() => {
    if (previousStartOpen.current && !startOpen) {
      startButtonRef.current?.focus();
    }
    previousStartOpen.current = startOpen;
  }, [startOpen]);

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

  const handleTaskbarActivate = useCallback(
    (id: string) => {
      const target = useWindowStore.getState().windowsById[id];
      if (!target) {
        return;
      }
      playSound(target.isMinimized ? "restore" : "click");
      if (target.isMinimized) {
        toggleMinimize(id);
      } else {
        focusWindow(id);
      }
    },
    [focusWindow, playSound, toggleMinimize]
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

  const windowConfigMap = useMemo(
    () => new Map(windowConfigs.map((config) => [config.id, config])),
    [windowConfigs]
  );

  const openWindows = useMemo(
    () =>
      openIds
        .map((id) => windowConfigMap.get(id))
        .filter((config): config is WindowConfig => Boolean(config)),
    [openIds, windowConfigMap]
  );

  const taskbarWindows = useMemo(() => {
    const windows: TaskbarWindow[] = [];
    openIds.forEach((id) => {
      const config = windowConfigMap.get(id);
      const state = windowsById[id];
      if (!config || !state) {
        return;
      }
      windows.push({
        id,
        title: config.title,
        isMinimized: state.isMinimized,
        icon: config.icon,
      });
    });
    return windows;
  }, [openIds, windowConfigMap, windowsById]);

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

  const icons: DesktopIcon[] = desktopModules.map((module) => ({
    id: `desktop-${module.id}`,
    label: module.title,
    variant: "app",
    icon: module.icon,
    action: { type: "window", target: module.id },
  }));

  const moduleMap = useMemo(
    () => new Map(startMenuModules.map((module) => [module.id, module])),
    [startMenuModules]
  );

  const startLeft: StartMenuItem[] = startMenuModules.slice(0, 6).map((module) => ({
    id: `pinned-${module.id}`,
    title: module.title,
    icon: module.icon,
    href: `#${module.id}`,
    section: "left",
    action: { type: "window", target: module.id },
  }));

  const startRight: StartMenuItem[] = [
    {
      id: "right-apps",
      title: "My Apps",
      icon: "/icons/xp/programs.png",
      href: "#apps",
      section: "right",
      hasSubmenu: true,
    },
    {
      id: "right-about",
      title: moduleMap.get("about")?.title ?? "About",
      icon: moduleMap.get("about")?.icon ?? "/icons/xp/docs.png",
      href: "#about",
      section: "right",
      action: moduleMap.get("about")
        ? { type: "window", target: "about" }
        : { type: "route", target: "/about" },
    },
    {
      id: "right-links",
      title: "Links",
      icon: "/icons/xp/favorite.svg",
      href: "#links",
      section: "right",
      hasSubmenu: true,
    },
    {
      id: "right-search",
      title: "Search",
      icon: "/icons/xp/internet.png",
      href: "#search",
      section: "right",
    },
    {
      id: "right-run",
      title: "Run…",
      icon: "/icons/xp/window.png",
      href: "#run",
      section: "right",
    },
  ];

  const contextModules = startMenuModules.slice(0, 3);
  const accountModule = startMenuModules.find((module) => module.id === "account");

  return (
    <div
      className="desktop-root"
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest(".start-menu") || target.closest(".start-button")) {
          return;
        }
        setStartOpen(false);
        setContextMenu((prev) => ({ ...prev, open: false }));
      }}
      onContextMenu={handleContextMenu}
    >
      <div className="desktop-wallpaper" aria-hidden />
      <OfflineBanner />
      <DesktopIcons icons={icons} onOpenWindow={handleOpenWindow} />
      <div className="desktop-windows">
        {openWindows.map((config) => {
          const state = windowsById[config.id];
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
              canClose={config.canClose}
              hideChrome={config.window?.hideChrome}
              dragHandleSelector={config.window?.dragHandleSelector}
              onClose={handleCloseWindow}
              onMinimize={handleToggleMinimize}
              onMaximize={handleToggleMaximize}
              onRestoreFromMaximize={restoreFromMaximize}
              onFocus={focusWindow}
              onPositionChange={moveWindow}
              onSizeChange={resizeWindow}
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
        <EcoMenu
          className="desktop-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          <EcoMenuItem
            className="desktop-menu-item"
            onClick={() => {
              playSound("click");
              cascadeWindows();
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Cascade Windows
          </EcoMenuItem>
          <EcoMenuItem
            className="desktop-menu-item"
            onClick={() => {
              playSound("click");
              tileWindows();
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Tile Windows
          </EcoMenuItem>
          <EcoMenuItem
            className="desktop-menu-item"
            onClick={() => {
              handleResetLayout();
              setContextMenu((prev) => ({ ...prev, open: false }));
            }}
          >
            Сбросить раскладку
          </EcoMenuItem>
          <div className="desktop-menu-divider" />
          {contextModules.map((module) => (
            <EcoMenuItem
              key={module.id}
              className="desktop-menu-item"
              onClick={() => {
                playSound("click");
                handleOpenWindow(module.id);
                setContextMenu((prev) => ({ ...prev, open: false }));
              }}
            >
              {module.title}
            </EcoMenuItem>
          ))}
        </EcoMenu>
      ) : null}
      <StartMenu
        key={startOpen ? "open" : "closed"}
        open={startOpen}
        items={[...startLeft, ...startRight]}
        onClose={() => setStartOpen(false)}
        onOpenWindow={handleOpenWindow}
        onPower={() => playSound("shutdown")}
        userEmail={userEmail}
      />
      <Taskbar
        windows={taskbarWindows}
        activeId={activeId}
        startOpen={startOpen}
        onToggleStart={() => setStartOpen((prev) => !prev)}
        onActivateWindow={handleTaskbarActivate}
        userEmail={userEmail ?? undefined}
        onOpenAccount={accountModule ? () => handleOpenWindow(accountModule.id) : undefined}
        startButtonRef={startButtonRef}
      />
    </div>
  );
}
