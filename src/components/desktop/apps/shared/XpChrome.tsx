import { ReactNode } from "react";

export function XpChrome({ left, children }: { left: ReactNode; children: ReactNode }) {
  return (
    <div className="xp-chrome">
      <aside className="xp-chrome-taskpane">{left}</aside>
      <section className="xp-chrome-content">{children}</section>
    </div>
  );
}
