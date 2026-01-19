import type { ModuleManifest } from "@/modules/types";
import VideoPlayerApp from "@/components/desktop/apps/VideoPlayerApp";

const VideoWindow: ModuleManifest["Window"] = () => <VideoPlayerApp />;

const manifest: ModuleManifest = {
  id: "video",
  title: "Video Player",
  subtitle: "Проигрыватель видео",
  icon: "/icons/xp/cd.png",
  desktopIcon: true,
  startMenu: true,
  Window: VideoWindow,
};

export default manifest;
