import { describe, it, expect } from "vitest";
import { shouldPersistLayout, type WindowLayout } from "../windowLayouts";

describe("window layout", () => {
  it("skips save when layout unchanged", () => {
    const layout: WindowLayout[] = [
      {
        id: "a",
        zIndex: 1,
        isOpen: true,
        isMinimized: false,
        position: { x: 0, y: 0 },
      },
    ];
    const result = shouldPersistLayout(layout, layout);
    expect(result).toBe(false);
  });
});
