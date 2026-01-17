import type { ComponentType } from "react";

export type ModuleManifest = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  desktopIcon?: boolean;
  startMenu?: boolean;
  defaultOpen?: boolean;
  order?: number;
};

export type ModuleLoader = () => Promise<{
  default: ComponentType<{ userEmail?: string | null }>;
}>;
