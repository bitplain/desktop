"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type WindowConfig = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  Window: ModuleManifest["Window"];
  defaultOpen?: boolean;
  canClose?: boolean;
  window?: ModuleManifest["window"];
};

const TASKBAR_HEIGHT = 44;

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
  const windowConfigs = useMemo<WindowConfig[]>(() => {
    return modules.map((module) => ({
      id: module.id,
      title: module.title,
      subtitle: module.subtitle,
      icon: module.icon,
      Window: module.Window,
      defaultOpen: module.defaultOpen ?? false,
      canClose: true,
      window: module.window,
    }));
  }, [modules, userEmail]);

  const storeConfigs = useMemo(
    () => windowConfigs.map(({ id, defaultOpen }) => ({ id, defaultOpen })),
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
              handleResetLayout();
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
                handleOpenWindow(module.id);
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
        onOpenWindow={handleOpenWindow}
        userEmail={userEmail}
      />
      <Taskbar
        windows={taskbarWindows}
        activeId={activeId}
        startOpen={startOpen}
        onToggleStart={() => setStartOpen((prev) => !prev)}
        onToggleWindow={handleToggleMinimize}
        onCascade={cascadeWindows}
        onTile={tileWindows}
        userEmail={userEmail ?? undefined}
        onOpenAccount={accountModule ? () => handleOpenWindow(accountModule.id) : undefined}
      />
    </div>
  );
}
