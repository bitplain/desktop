"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { WindowControlsProvider } from "./WindowControlsContext";
import { shouldStartDragForTarget } from "./windowDragHandle";
import {
  clampWindowBounds,
  WINDOW_MARGIN,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
} from "@/lib/windowBounds";
import { useWindowStore } from "@/stores/windowStore";

type Position = { x: number; y: number };

type Size = { width: number; height: number };

type DragEvent = PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>;

type DragState = {
  offsetX: number;
  offsetY: number;
  restoreOnMove?: boolean;
  startX?: number;
  startY?: number;
};

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const TASKBAR_HEIGHT = 34;
const FALLBACK_POSITION: Position = { x: 0, y: 0 };
const FALLBACK_SIZE: Size = { width: 0, height: 0 };

type WindowProps = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  canClose?: boolean;
  hideChrome?: boolean;
  dragHandleSelector?: string;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onRestoreFromMaximize: (id: string, position: Position, size: Size) => void;
  onFocus: (id: string) => void;
  onPositionChange: (id: string, position: Position) => void;
  onSizeChange: (id: string, size: Size) => void;
  children: React.ReactNode;
};

export default function Window({
  id,
  title,
  subtitle,
  icon,
  canClose = true,
  hideChrome = false,
  dragHandleSelector,
  onClose,
  onMinimize,
  onMaximize,
  onRestoreFromMaximize,
  onFocus,
  onPositionChange,
  onSizeChange,
  children,
}: WindowProps) {
  const windowState = useWindowStore((state) => state.windowsById[id]);
  const dragState = useRef<DragState | null>(null);
  const resizeState = useRef<{
    startX: number;
    startY: number;
    size: Size;
    position: Position;
    direction: ResizeDirection;
  } | null>(null);
  const isMinimized = windowState?.isMinimized ?? true;
  const isMaximized = windowState?.isMaximized ?? false;
  const restore = windowState?.restore;
  const zIndex = windowState?.zIndex ?? 0;
  const position = useMemo(
    () => windowState?.position ?? FALLBACK_POSITION,
    [windowState?.position]
  );
  const size = useMemo(() => windowState?.size ?? FALLBACK_SIZE, [windowState?.size]);

  useEffect(() => {
    if (!windowState) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (isMaximized) {
      return;
    }
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight - TASKBAR_HEIGHT;
    const next = clampWindowBounds({
      size,
      position,
      viewWidth,
      viewHeight,
    });
    if (next.size.width !== size.width || next.size.height !== size.height) {
      onSizeChange(id, next.size);
    }
    if (next.position.x !== position.x || next.position.y !== position.y) {
      onPositionChange(id, next.position);
    }
  }, [id, isMaximized, onPositionChange, onSizeChange, position, size, windowState]);

  const dragSelector = dragHandleSelector ?? ".window-header";

  const shouldStartDrag = (event: DragEvent) =>
    shouldStartDragForTarget(event.target as HTMLElement, dragSelector);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    onFocus(id);
    if (!shouldStartDrag(event)) {
      return;
    }
    if (isMaximized) {
      dragState.current = {
        offsetX: 0,
        offsetY: 0,
        restoreOnMove: true,
        startX: event.clientX,
        startY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    dragState.current = {
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) {
      return;
    }
    if (dragState.current.restoreOnMove) {
      const dx = Math.abs(event.clientX - (dragState.current.startX ?? 0));
      const dy = Math.abs(event.clientY - (dragState.current.startY ?? 0));
      if (dx < 4 && dy < 4) {
        return;
      }
      const fallbackSize = { width: 760, height: 520 };
      const restoreSize = restore?.size ?? fallbackSize;
      const viewWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
      const viewHeight = typeof window !== "undefined" ? window.innerHeight - 44 : 768;
      const ratioX = viewWidth ? event.clientX / viewWidth : 0.5;
      const next = clampWindowBounds({
        size: restoreSize,
        position: {
          x: event.clientX - restoreSize.width * ratioX,
          y: event.clientY - 24,
        },
        viewWidth,
        viewHeight,
      });
      onRestoreFromMaximize(id, next.position, next.size);
      dragState.current = {
        offsetX: event.clientX - next.position.x,
        offsetY: event.clientY - next.position.y,
      };
      return;
    }
    const next = {
      x: event.clientX - dragState.current.offsetX,
      y: event.clientY - dragState.current.offsetY,
    };
    const viewWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const viewHeight =
      typeof window !== "undefined" ? window.innerHeight - TASKBAR_HEIGHT : 768;
    const clamped = clampWindowBounds({ size, position: next, viewWidth, viewHeight });
    onPositionChange(id, clamped.position);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) {
      return;
    }
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleResizeStart =
    (direction: ResizeDirection) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) {
      return;
    }
    event.stopPropagation();
    onFocus(id);
    resizeState.current = {
      startX: event.clientX,
      startY: event.clientY,
      size,
      position,
      direction,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) {
      return;
    }
    const { startX, startY, size: startSize, position: startPos, direction } =
      resizeState.current;
    const viewWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const viewHeight =
      typeof window !== "undefined" ? window.innerHeight - TASKBAR_HEIGHT : 768;
    const maxWidth = Math.max(160, viewWidth - WINDOW_MARGIN * 2);
    const maxHeight = Math.max(200, viewHeight - WINDOW_MARGIN * 2);
    const minWidth = Math.min(WINDOW_MIN_WIDTH, maxWidth);
    const minHeight = Math.min(WINDOW_MIN_HEIGHT, maxHeight);
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    let nextWidth = startSize.width;
    let nextHeight = startSize.height;
    let nextX = startPos.x;
    let nextY = startPos.y;

    if (direction.includes("e")) {
      nextWidth = startSize.width + dx;
    }
    if (direction.includes("s")) {
      nextHeight = startSize.height + dy;
    }
    if (direction.includes("w")) {
      nextWidth = startSize.width - dx;
    }
    if (direction.includes("n")) {
      nextHeight = startSize.height - dy;
    }

    nextWidth = Math.min(Math.max(minWidth, nextWidth), maxWidth);
    nextHeight = Math.min(Math.max(minHeight, nextHeight), maxHeight);

    if (direction.includes("w")) {
      nextX = startPos.x + (startSize.width - nextWidth);
    }
    if (direction.includes("n")) {
      nextY = startPos.y + (startSize.height - nextHeight);
    }

    const clamped = clampWindowBounds({
      size: { width: nextWidth, height: nextHeight },
      position: { x: nextX, y: nextY },
      viewWidth,
      viewHeight,
    });

    onSizeChange(id, clamped.size);
    if (clamped.position.x !== startPos.x || clamped.position.y !== startPos.y) {
      onPositionChange(id, clamped.position);
    }
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (!windowState) {
    return null;
  }
  const controls = {
    minimize: () => onMinimize(id),
    maximize: () => onMaximize(id),
    close: () => (canClose ? onClose(id) : onMinimize(id)),
    isMaximized,
    isMinimized,
  };

  return (
    <section
      className={`window eco-window ${isMinimized ? "is-minimized" : ""} ${
        isMaximized ? "is-maximized" : ""
      } ${hideChrome ? "window--chromeless" : ""}`}
      data-eco="window"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex,
        width: size.width,
        height: size.height,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={(event: MouseEvent<HTMLDivElement>) => {
        if (!shouldStartDrag(event)) {
          return;
        }
        onMaximize(id);
      }}
      aria-hidden={isMinimized}
    >
      {hideChrome ? null : (
        <div className="window-header eco-window__header">
          <div className="window-titlebar eco-window__titlebar">
            {icon ? (
              <span
                className="window-icon"
                style={{ backgroundImage: `url(${icon})` }}
                aria-hidden
              />
            ) : null}
            <div>
              <div className="window-title">{title}</div>
              {subtitle ? <div className="window-subtitle">{subtitle}</div> : null}
            </div>
          </div>
          <div className="window-controls eco-window__controls">
            <button
              className="window-control minimize"
              type="button"
              data-eco="window-control"
              aria-label="Minimize"
              onClick={controls.minimize}
            />
            <button
              className="window-control maximize"
              type="button"
              data-eco="window-control"
              aria-label="Maximize"
              onClick={controls.maximize}
            />
            <button
              className="window-control close"
              type="button"
              data-eco="window-control"
              aria-label="Close"
              onClick={controls.close}
            />
          </div>
        </div>
      )}
      <div className="window-content">
        <WindowControlsProvider value={controls}>{children}</WindowControlsProvider>
      </div>
      {(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeDirection[]).map(
        (direction) => (
          <div
            key={direction}
            className={`window-resize ${direction}`}
            onPointerDown={handleResizeStart(direction)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
          />
        )
      )}
    </section>
  );
}
