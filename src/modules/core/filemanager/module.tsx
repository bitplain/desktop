import type { ModuleManifest } from "@/modules/types";
import FileManagerApp from "@/components/desktop/apps/FileManagerApp";

const FileManagerWindow: ModuleManifest["Window"] = ({ openWindow }) => (
  <FileManagerApp onOpenVideo={() => openWindow?.("video")} />
);

const manifest: ModuleManifest = {
  id: "filemanager",
  title: "File Manager",
  subtitle: "Файлы пользователя",
  icon: "/icons/xp/folder.png",
  desktopIcon: true,
  startMenu: true,
  Window: FileManagerWindow,
};

export default manifest;
