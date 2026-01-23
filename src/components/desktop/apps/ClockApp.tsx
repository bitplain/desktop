"use client";

import { useEffect, useState } from "react";

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
    <div className="stack">
      <div className="panel-title">System Clock</div>
      <div className="clock-face">
        <div className="clock-time">{timeLabel}</div>
        <div className="muted">{dateLabel}</div>
      </div>
    </div>
  );
}
