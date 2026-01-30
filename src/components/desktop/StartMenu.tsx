"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { handleLogoutFlow } from "@/lib/authFlow";
import { useSettings } from "./SettingsProvider";

export type StartMenuItem = {
  id: string;
  title: string;
  icon?: string;
  href?: string;
  section: "left" | "right";
  hasSubmenu?: boolean;
  disabled?: boolean;
  action?: { type: "window"; target: string } | { type: "route"; target: string };
};

export default function StartMenu({
  open,
  items,
  onClose,
  onOpenWindow,
  onPower,
  userEmail,
}: {
  open: boolean;
  items: StartMenuItem[];
  onClose: () => void;
  onOpenWindow: (id: string) => void;
  onPower?: () => void;
  userEmail?: string | null;
}) {
  const router = useRouter();
  const { playSound } = useSettings();
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

  const leftItems = useMemo(
    () => items.filter((item) => item.section === "left"),
    [items]
  );
  const rightItems = useMemo(
    () => items.filter((item) => item.section === "right"),
    [items]
  );

  if (!open) {
    return null;
  }

  const firstItemId = leftItems[0]?.id ?? rightItems[0]?.id;

  useEffect(() => {
    firstItemRef.current?.focus();
  }, []);

  const handleAction = (item: StartMenuItem) => {
    if (item.disabled) {
      return;
    }
    playSound("click");
    if (item.action?.type === "route") {
      router.push(item.action.target);
    } else if (item.action?.type === "window") {
      onOpenWindow(item.action.target);
    } else if (item.href) {
      if (item.href.startsWith("/")) {
        router.push(item.href);
      } else {
        window.location.href = item.href;
      }
    }
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    await handleLogoutFlow({
      playSound,
      signOut,
      navigate: (path) => router.replace(path),
    });
  };

  return (
    <div
      className="start-menu"
      id="start-menu"
      role="menu"
      aria-label="Start menu"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="start-menu-header">
        <div className="start-menu-avatar" aria-hidden />
        <div className="start-menu-usertext">
          <div className="start-menu-username">{userEmail || "User"}</div>
          <div className="start-menu-subtitle">Eco Calm</div>
        </div>
      </div>
      <div className="start-menu-body">
        <div className="start-menu-column start-menu-left">
          <div className="start-menu-column-title">Pinned / Recent</div>
          {leftItems.map((item) => (
            <button
              key={item.id}
              className={`start-menu-item ${item.disabled ? "is-disabled" : ""}`}
              type="button"
              onClick={() => handleAction(item)}
              ref={item.id === firstItemId ? firstItemRef : null}
              role="menuitem"
              disabled={item.disabled}
              aria-disabled={item.disabled}
            >
              <span
                className="start-menu-icon"
                style={item.icon ? { backgroundImage: `url(${item.icon})` } : undefined}
                aria-hidden
              />
              <span className="start-menu-label">{item.title}</span>
            </button>
          ))}
        </div>
        <div className="start-menu-column start-menu-right">
          <div className="start-menu-column-title">Places</div>
          {rightItems.map((item) => (
            <button
              key={item.id}
              className={`start-menu-item ${item.hasSubmenu ? "has-submenu" : ""} ${
                item.disabled ? "is-disabled" : ""
              }`}
              type="button"
              onClick={() => handleAction(item)}
              ref={item.id === firstItemId ? firstItemRef : null}
              role="menuitem"
              disabled={item.disabled}
              aria-disabled={item.disabled}
            >
              <span
                className="start-menu-icon"
                style={item.icon ? { backgroundImage: `url(${item.icon})` } : undefined}
                aria-hidden
              />
              <span className="start-menu-label">{item.title}</span>
              {item.hasSubmenu ? (
                <span className="start-menu-arrow" aria-hidden>
                  ›
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <div className="start-menu-footer">
        <button className="start-menu-action" type="button" onClick={handleLogout}>
          Log off
        </button>
        <button
          className="start-menu-action is-accent"
          type="button"
          onClick={() => {
            playSound("click");
            onPower?.();
            onClose();
          }}
        >
          Power
        </button>
      </div>
    </div>
  );
}
