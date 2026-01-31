import { ReactNode } from "react";
export function XpChrome({ left, children }: { left: ReactNode; children: ReactNode }) {
  return (
    <div className="cfm-chrome">
      <aside className="cfm-chrome__aside">{left}</aside>
      <section className="cfm-chrome__content">{children}</section>
    </div>
  );
}
