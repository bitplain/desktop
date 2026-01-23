"use client";

import { useEffect, useMemo, useState, type Ref } from "react";
import { useSettings } from "./SettingsProvider";

export type TaskbarWindow = {
  id: string;
  title: string;
  isMinimized: boolean;
  icon?: string;
};

export default function Taskbar({
  windows,
  activeId,
  startOpen,
  onToggleStart,
  onActivateWindow,
  userEmail,
  onOpenAccount,
  startButtonRef,
}: {
  windows: TaskbarWindow[];
  activeId?: string;
  startOpen: boolean;
  onToggleStart: () => void;
  onActivateWindow: (id: string) => void;
  userEmail?: string;
  onOpenAccount?: () => void;
  startButtonRef?: Ref<HTMLButtonElement>;
}) {
  const { playSound } = useSettings();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = now
    ? now.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  const ordered = useMemo(
    () => [...windows].sort((a, b) => a.title.localeCompare(b.title)),
    [windows]
  );

  const trayIcons = [
    {
      id: "network",
      label: "Network",
      svg: (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            d="M4 16c2.5-2.2 5.1-3.3 8-3.3s5.5 1.1 8 3.3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M7 19c1.6-1.4 3.3-2.1 5-2.1s3.4.7 5 2.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="12" cy="20" r="1.4" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: "volume",
      label: "Volume",
      svg: (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            d="M5 10h4l5-4v12l-5-4H5z"
            fill="currentColor"
          />
          <path
            d="M17 9c1.6 1.6 1.6 4.4 0 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "shield",
      label: "Security",
      svg: (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 4l7 3v5c0 4.3-3 7.6-7 8.9-4-1.3-7-4.6-7-8.9V7z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      ),
    },
    {
      id: "lang",
      label: "Language",
      svg: (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect
            x="4"
            y="6"
            width="16"
            height="12"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M9 10h6M12 10v4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="taskbar">
      <button
        className={`start-button ${startOpen ? "is-open" : ""}`}
        type="button"
        ref={startButtonRef}
        onClick={() => {
          playSound("start");
          onToggleStart();
        }}
        aria-haspopup="menu"
        aria-expanded={startOpen}
        aria-controls="start-menu"
      >
        <span className="start-button-icon" aria-hidden>
          <svg viewBox="0 0 24 24">
            <path
              d="M6 14c4-1 6-5 12-8-1 7-5 11-10 12-2 .4-4-.6-4-2.2 0-1.1.7-1.9 2-1.8z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 15c.6 1.7 2 2.6 3.8 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="start-button-label">start</span>
      </button>
      <div className="taskbar-items">
        {ordered.map((window) => (
          <button
            key={window.id}
            className={`taskbar-item ${activeId === window.id ? "active" : ""} ${
              window.isMinimized ? "is-minimized" : ""
            }`}
            type="button"
            onClick={() => {
              playSound("click");
              onActivateWindow(window.id);
            }}
          >
            {window.icon ? (
              <span
                className="taskbar-icon"
                style={{ backgroundImage: `url(${window.icon})` }}
                aria-hidden
              />
            ) : null}
            <span className="taskbar-title">{window.title}</span>
          </button>
        ))}
      </div>
      <div className="taskbar-divider" aria-hidden />
      <div className="taskbar-tray">
        {trayIcons.map((icon) => (
          <button key={icon.id} className="tray-icon" type="button" aria-label={icon.label}>
            <span className="tray-icon-image">{icon.svg}</span>
          </button>
        ))}
        {userEmail && onOpenAccount ? (
          <button
            className="tray-icon"
            type="button"
            title={userEmail}
            onClick={() => {
              playSound("click");
              onOpenAccount();
            }}
            aria-label="Account"
          >
            <span className="tray-icon-image">
              <svg viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="8.5" r="3.5" fill="currentColor" />
                <path
                  d="M5 19c1.8-3.2 4.3-4.8 7-4.8s5.2 1.6 7 4.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </button>
        ) : null}
        <div className="taskbar-clock" aria-label="Time">
          {timeLabel}
        </div>
      </div>
    </div>
  );
}
