import type { ModuleManifest } from "@/modules/types";

const manifest: ModuleManifest = {
  id: "system",
  title: "System",
  subtitle: "Настройки рабочего стола",
  icon: "/icons/xp/monitor.png",
  desktopIcon: true,
  startMenu: true,
};

export default manifest;
