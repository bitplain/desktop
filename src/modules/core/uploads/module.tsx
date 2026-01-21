import type { ModuleManifest } from "@/modules/types";
import UploadManagerApp from "@/components/desktop/apps/UploadManagerApp";

const UploadsWindow: ModuleManifest["Window"] = ({ closeWindow }) => (
  <UploadManagerApp onClose={() => closeWindow?.("uploads")} />
);

const manifest: ModuleManifest = {
  id: "uploads",
  title: "Загрузки",
  subtitle: "Прогресс загрузки",
  icon: "/icons/xp/folder.png",
  desktopIcon: false,
  startMenu: false,
  window: {
    hideChrome: true,
    dragHandleSelector: ".xp-window .titlebar",
  },
  Window: UploadsWindow,
};

export default manifest;
