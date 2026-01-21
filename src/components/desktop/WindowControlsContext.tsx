"use client";

import { createContext, useContext } from "react";

export type WindowControls = {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: boolean;
  isMinimized: boolean;
};

const WindowControlsContext = createContext<WindowControls | null>(null);

export function WindowControlsProvider({
  value,
  children,
}: {
  value: WindowControls;
  children: React.ReactNode;
}) {
  return (
    <WindowControlsContext.Provider value={value}>
      {children}
    </WindowControlsContext.Provider>
  );
}

export function useWindowControls() {
  return useContext(WindowControlsContext);
}
