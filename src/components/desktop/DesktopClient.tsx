"use client";

import DesktopShell from "./DesktopShell";
import { modulesMeta, moduleLoaders } from "@/modules/registry";

export default function DesktopClient({ userEmail }: { userEmail?: string | null }) {
  return (
    <DesktopShell
      modules={modulesMeta}
      moduleLoaders={moduleLoaders}
      userEmail={userEmail}
    />
  );
}
