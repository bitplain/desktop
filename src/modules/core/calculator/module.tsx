import type { ModuleManifest } from "@/modules/types";
import CalculatorApp from "@/components/desktop/apps/CalculatorApp";

const CalculatorWindow = (_props: { userEmail?: string | null }) => <CalculatorApp />;

const module: ModuleManifest = {
  id: "calculator",
  title: "Calculator",
  subtitle: "Быстрые расчеты",
  icon: "/icons/xp/window.png",
  desktopIcon: true,
  startMenu: true,
  Window: CalculatorWindow,
};

export default module;
