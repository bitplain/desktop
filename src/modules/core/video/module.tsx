import type { ModuleManifest } from "@/modules/types";
import VideoPlayerApp from "@/components/desktop/apps/VideoPlayerApp";
import { ICON_PATHS } from "@/lib/iconMap";

const VideoWindow: ModuleManifest["Window"] = () => <VideoPlayerApp />;

const manifest: ModuleManifest = {
  id: "video",
  title: "Видео",
  subtitle: "Проигрыватель видео",
  icon: ICON_PATHS.videoPlayer,
  desktopIcon: true,
  startMenu: true,
  window: {
    hideChrome: true,
    dragHandleSelector: ".xp-window .titlebar",
    defaultSize: { width: 520, height: 920 },
  },
  Window: VideoWindow,
};

export default manifest;
