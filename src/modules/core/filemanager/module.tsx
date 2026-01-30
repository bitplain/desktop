import type { ModuleManifest } from "@/modules/types";
import FileManagerApp from "@/components/desktop/apps/FileManagerApp";
import { ICON_PATHS } from "@/lib/iconMap";

const FileManagerWindow: ModuleManifest["Window"] = ({ openWindow }) => (
  <FileManagerApp
    onOpenVideo={() => openWindow?.("video")}
    onOpenUploads={() => openWindow?.("uploads")}
  />
);

const manifest: ModuleManifest = {
  id: "filemanager",
  title: "Файловый менеджер",
  subtitle: "Файлы пользователя",
  icon: ICON_PATHS.fileManager,
  desktopIcon: true,
  startMenu: true,
  window: {
    hideChrome: true,
    dragHandleSelector: ".xp-explorer .titlebar",
  },
  Window: FileManagerWindow,
};

export default manifest;
