import type { ComponentType } from "react";

export type ModuleManifest = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  desktopIcon?: boolean;
  startMenu?: boolean;
  defaultOpen?: boolean;
  Window: ComponentType<{
    userEmail?: string | null;
    openWindow?: (id: string) => void;
    closeWindow?: (id: string) => void;
  }>;
};
