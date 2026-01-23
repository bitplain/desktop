"use client";

import { useEffect, useState } from "react";
import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";

export default function ClockApp() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLabel = now
    ? now.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";
  const dateLabel = now
    ? now.toLocaleDateString("ru-RU", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <XpWindow title="System Clock">
      <div className="stack">
        <div className="eco-card">
          <div className="eco-card-title">System Clock</div>
          <div className="clock-face eco-clock">
            <div className="clock-time eco-stat">{timeLabel}</div>
            <div className="muted">{dateLabel}</div>
          </div>
        </div>
      </div>
    </XpWindow>
  );
}
