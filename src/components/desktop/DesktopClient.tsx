"use client";

import DesktopShell from "./DesktopShell";
import { modules } from "@/modules/registry";

export default function DesktopClient({ userEmail }: { userEmail?: string | null }) {
  return <DesktopShell modules={modules} userEmail={userEmail} />;
}
