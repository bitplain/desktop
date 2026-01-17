"use client";

import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import DesktopClient from "@/components/desktop/DesktopClient";
import SettingsProvider from "@/components/desktop/SettingsProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
  }),
}));

vi.mock("next-auth/react", () => ({
  signOut: () => Promise.resolve(),
}));

describe("DesktopClient", () => {
  it("renders module metadata without loading windows", () => {
    const html = renderToString(
      <SettingsProvider>
        <DesktopClient userEmail={null} />
      </SettingsProvider>
    );
    expect(html).toContain("Notepad");
  });
});
