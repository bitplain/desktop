"use client";

import type { ReactNode } from "react";
import { XpTitlebar } from "./XpTitlebar";

export function XpWindow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="xp-window">
      <XpTitlebar title={title} />
      <div className="xp-window-body">{children}</div>
    </div>
  );
}
