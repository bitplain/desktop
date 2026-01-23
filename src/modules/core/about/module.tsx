import type { ModuleManifest } from "@/modules/types";
import AboutApp from "@/components/desktop/apps/AboutApp";

const AboutWindow: ModuleManifest["Window"] = () => <AboutApp />;

const manifest: ModuleManifest = {
  id: "about",
  title: "About",
  subtitle: "О программе",
  icon: "/icons/xp/window.png",
  desktopIcon: true,
  startMenu: true,
  defaultOpen: true,
  window: {
    hideChrome: true,
    dragHandleSelector: ".xp-window .titlebar",
  },
  Window: AboutWindow,
};

export default manifest;
