import { describe, expect, it } from "vitest";
import { shouldStartDragForTarget } from "../windowDragHandle";

function makeTarget(hits: string[]) {
  return {
    closest: (selector: string) => (hits.includes(selector) ? ({} as Element) : null),
  };
}

describe("window drag handle", () => {
  it("does not start drag from xp window buttons", () => {
    const target = makeTarget([".win-btn", ".xp-window .titlebar"]);
    expect(shouldStartDragForTarget(target, ".xp-window .titlebar")).toBe(false);
  });

  it("starts drag from allowed handle", () => {
    const target = makeTarget([".xp-window .titlebar"]);
    expect(shouldStartDragForTarget(target, ".xp-window .titlebar")).toBe(true);
  });

  it("does not start drag from cutefish window controls", () => {
    const target = makeTarget([
      ".cfm-window-btn",
      ".cfm-window-controls",
      ".cfm-header",
    ]);
    expect(shouldStartDragForTarget(target, ".cfm-header")).toBe(false);
  });
});
