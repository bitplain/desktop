import type { ModuleManifest } from "@/modules/types";
import SystemApp from "@/components/desktop/apps/SystemApp";
import { ICON_PATHS } from "@/lib/iconMap";

const SystemWindow: ModuleManifest["Window"] = () => <SystemApp title="Настройки" />;

const manifest: ModuleManifest = {
  id: "system",
  title: "Настройки",
  subtitle: "Настройки рабочего стола",
  icon: ICON_PATHS.system,
  desktopIcon: true,
  startMenu: true,
  window: {
    hideChrome: true,
    dragHandleSelector: ".cfm-app-header",
  },
  Window: SystemWindow,
};

export default manifest;
