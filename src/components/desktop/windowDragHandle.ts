"use client";

export type ClosestTarget = {
  closest: (selector: string) => Element | null;
};

export function shouldStartDragForTarget(target: ClosestTarget, dragSelector?: string) {
  if (
    target.closest(".window-controls") ||
    target.closest(".window-resize") ||
    target.closest(".win-buttons") ||
    target.closest(".win-btn") ||
    target.closest(".cfm-window-controls") ||
    target.closest(".cfm-window-btn") ||
    target.closest(".cfm-action-btn") ||
    target.closest(".cfm-nav-btn")
  ) {
    return false;
  }
  if (!dragSelector) {
    return false;
  }
  return Boolean(target.closest(dragSelector));
}
