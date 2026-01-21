import type { ModuleManifest } from "@/modules/types";
import FileManagerApp from "@/components/desktop/apps/FileManagerApp";

const FileManagerWindow: ModuleManifest["Window"] = ({ openWindow, closeWindow }) => (
  <FileManagerApp
    onOpenVideo={() => openWindow?.("video")}
    onOpenUploads={() => openWindow?.("uploads")}
    onClose={() => closeWindow?.("filemanager")}
  />
);

const manifest: ModuleManifest = {
  id: "filemanager",
  title: "File Manager",
  subtitle: "Файлы пользователя",
  icon: "/icons/xp/folder.png",
  desktopIcon: true,
  startMenu: true,
  window: {
    hideChrome: true,
    dragHandleSelector: ".xp-explorer .titlebar",
  },
  Window: FileManagerWindow,
};

export default manifest;
