import type { ModuleManifest } from "@/modules/types";
import NotepadApp from "@/components/desktop/apps/NotepadApp";

const NotepadWindow = (_props: { userEmail?: string | null }) => <NotepadApp />;

const module: ModuleManifest = {
  id: "notepad",
  title: "Notepad",
  subtitle: "Быстрые заметки",
  icon: "/icons/xp/docs.png",
  desktopIcon: true,
  startMenu: true,
  Window: NotepadWindow,
};

export default module;
