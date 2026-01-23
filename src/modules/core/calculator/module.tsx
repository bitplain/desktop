import type { ModuleManifest } from "@/modules/types";
import CalculatorApp from "@/components/desktop/apps/CalculatorApp";

const CalculatorWindow: ModuleManifest["Window"] = () => <CalculatorApp />;

const manifest: ModuleManifest = {
  id: "calculator",
  title: "Calculator",
  subtitle: "Быстрые расчеты",
  icon: "/icons/xp/window.png",
  desktopIcon: true,
  startMenu: true,
  window: {
    hideChrome: true,
    dragHandleSelector: ".xp-window .titlebar",
  },
  Window: CalculatorWindow,
};

export default manifest;
