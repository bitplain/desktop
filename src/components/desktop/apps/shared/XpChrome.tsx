import { ReactNode } from "react";
import { EcoChrome } from "@/components/ui/eco";

export function XpChrome({ left, children }: { left: ReactNode; children: ReactNode }) {
  return (
    <EcoChrome className="xp-chrome">
      <aside className="xp-chrome-taskpane eco-chrome__aside">{left}</aside>
      <section className="xp-chrome-content eco-chrome__content">{children}</section>
    </EcoChrome>
  );
}
