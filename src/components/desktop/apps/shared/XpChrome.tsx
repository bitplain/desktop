import { ReactNode } from "react";

export function XpChrome({ left, children }: { left: ReactNode; children: ReactNode }) {
  return (
    <div className="xp-chrome eco-chrome">
      <aside className="xp-chrome-taskpane eco-chrome__aside">{left}</aside>
      <section className="xp-chrome-content eco-chrome__content">{children}</section>
    </div>
  );
}
