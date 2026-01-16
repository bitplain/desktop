import type { ModuleManifest } from "@/modules/types";
import SystemApp from "@/components/desktop/apps/SystemApp";

const SystemWindow: ModuleManifest["Window"] = () => (
  <SystemApp
    title="System"
    message="Настройки рабочего стола, звуки и сеть управляются локально."
  />
);

const manifest: ModuleManifest = {
  id: "system",
  title: "System",
  subtitle: "Настройки рабочего стола",
  icon: "/icons/xp/monitor.png",
  desktopIcon: true,
  startMenu: true,
  Window: SystemWindow,
};

export default manifest;
