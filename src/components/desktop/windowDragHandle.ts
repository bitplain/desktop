"use client";

export type ClosestTarget = {
  closest: (selector: string) => Element | null;
};

export function shouldStartDragForTarget(target: ClosestTarget, dragSelector?: string) {
  if (
    target.closest(".window-controls") ||
    target.closest(".window-resize") ||
    target.closest(".win-buttons") ||
    target.closest(".win-btn")
  ) {
    return false;
  }
  if (!dragSelector) {
    return false;
  }
  return Boolean(target.closest(dragSelector));
}
