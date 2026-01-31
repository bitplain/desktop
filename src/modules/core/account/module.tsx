import type { ModuleManifest } from "@/modules/types";
import AccountApp from "@/components/desktop/apps/AccountApp";

const AccountWindow = ({ userEmail }: { userEmail?: string | null }) => (
  <AccountApp email={userEmail} />
);

const manifest: ModuleManifest = {
  id: "account",
  title: "Account",
  subtitle: "Профиль и пароль",
  icon: "/icons/xp/user.svg",
  desktopIcon: true,
  startMenu: true,
  window: {
    hideChrome: true,
    dragHandleSelector: ".cfm-app-header",
  },
  Window: AccountWindow,
};

export default manifest;
