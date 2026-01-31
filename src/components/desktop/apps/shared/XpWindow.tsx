"use client";

import type { ReactNode } from "react";
import { XpTitlebar } from "./XpTitlebar";

export function XpWindow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="cfm-window cfm-window--app">
      <XpTitlebar title={title} />
      <div className="cfm-app-body">{children}</div>
    </div>
  );
}
