"use client";

import type { ReactNode } from "react";
import { EcoAppWindow } from "@/components/ui/eco";
import { XpTitlebar } from "./XpTitlebar";

export function XpWindow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <EcoAppWindow className="xp-window">
      <XpTitlebar title={title} />
      <div className="xp-window-body eco-app-body">{children}</div>
    </EcoAppWindow>
  );
}
