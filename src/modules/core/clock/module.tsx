import type { ModuleManifest } from "@/modules/types";
import ClockApp from "@/components/desktop/apps/ClockApp";

const ClockWindow = (_props: { userEmail?: string | null }) => <ClockApp />;

const module: ModuleManifest = {
  id: "clock",
  title: "Clock",
  subtitle: "Время системы",
  icon: "/icons/xp/monitor.png",
  desktopIcon: true,
  startMenu: true,
  Window: ClockWindow,
};

export default module;
