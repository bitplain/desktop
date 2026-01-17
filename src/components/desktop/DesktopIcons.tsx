"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "./SettingsProvider";
import { computeVirtualRows } from "@/lib/iconLayout";

export type DesktopIcon = {
  id: string;
  label: string;
  variant: string;
  icon?: string;
  action: { type: "window"; target: string } | { type: "route"; target: string };
};

export default function DesktopIcons({
  icons,
  onOpenWindow,
  onPrefetchWindow,
}: {
  icons: DesktopIcon[];
  onOpenWindow: (id: string) => void;
  onPrefetchWindow?: (id: string) => void;
}) {
  const router = useRouter();
  const { playSound } = useSettings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0, scrollTop: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setViewport((prev) => ({
        ...prev,
        width: rect.width,
        height: rect.height,
      }));
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const layout = useMemo(() => {
    const shouldVirtualize = icons.length > 32 && viewport.height > 0;
    const gridGap = 18;
    const iconWidth = 88;
    const rowHeight = 108;
    const columns = Math.max(
      1,
      Math.floor((viewport.width + gridGap) / (iconWidth + gridGap))
    );
    if (!shouldVirtualize) {
      return {
        shouldVirtualize,
        rowHeight,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        visibleIcons: icons,
      };
    }
    const virtual = computeVirtualRows(viewport.height, rowHeight, icons, {
      columns,
      scrollTop: viewport.scrollTop,
      overscan: 1,
    });
    return {
      shouldVirtualize,
      rowHeight,
      topSpacerHeight: virtual.topSpacerHeight,
      bottomSpacerHeight: virtual.bottomSpacerHeight,
      visibleIcons: icons.slice(virtual.startIndex, virtual.endIndex + 1),
    };
  }, [icons, viewport.height, viewport.scrollTop, viewport.width]);

  return (
    <div
      className="desktop-icons"
      ref={containerRef}
      onClick={() => setSelectedId(null)}
      onScroll={(event) => {
        const nextScrollTop = (event.currentTarget as HTMLDivElement).scrollTop;
        setViewport((prev) =>
          prev.scrollTop === nextScrollTop ? prev : { ...prev, scrollTop: nextScrollTop }
        );
      }}
      style={
        layout.shouldVirtualize
          ? {
              maxHeight: "calc(100vh - 140px)",
              overflowY: "auto",
              gridAutoRows: `${layout.rowHeight}px`,
            }
          : undefined
      }
    >
      {layout.topSpacerHeight ? (
        <div style={{ height: layout.topSpacerHeight, gridColumn: "1 / -1" }} />
      ) : null}
      {layout.visibleIcons.map((icon) => (
        <button
          key={icon.id}
          className={`desktop-icon variant-${icon.variant} ${
            selectedId === icon.id ? "selected" : ""
          }`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            playSound("click");
            setSelectedId(icon.id);
          }}
          onMouseEnter={() => {
            if (icon.action.type === "window") {
              onPrefetchWindow?.(icon.action.target);
            }
          }}
          onFocus={() => {
            if (icon.action.type === "window") {
              onPrefetchWindow?.(icon.action.target);
            }
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            playSound("notify");
            if (icon.action.type === "route") {
              router.push(icon.action.target);
            } else {
              onOpenWindow(icon.action.target);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              playSound("notify");
              if (icon.action.type === "route") {
                router.push(icon.action.target);
              } else {
                onOpenWindow(icon.action.target);
              }
            }
          }}
        >
          <span
            className="desktop-icon-glyph"
            style={icon.icon ? { backgroundImage: `url(${icon.icon})` } : undefined}
            aria-hidden
          />
          <span className="desktop-icon-label">{icon.label}</span>
        </button>
      ))}
      {layout.bottomSpacerHeight ? (
        <div style={{ height: layout.bottomSpacerHeight, gridColumn: "1 / -1" }} />
      ) : null}
    </div>
  );
}
