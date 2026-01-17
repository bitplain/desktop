import { describe, it, expect } from "vitest";
import { sortIconsByLabel } from "../iconLayout";

describe("icon layout", () => {
  it("sorts icons by label", () => {
    const icons = [
      { id: "b", label: "B" },
      { id: "a", label: "A" },
    ];
    const sorted = sortIconsByLabel(icons);
    expect(sorted[0].id).toBe("a");
  });
});
