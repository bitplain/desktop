"use client";

import { useEffect, useState } from "react";
import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";
import { EcoCard, EcoCardTitle, EcoStat } from "@/components/ui/eco";

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
        <EcoCard>
          <EcoCardTitle>System Clock</EcoCardTitle>
          <div className="clock-face eco-clock">
            <EcoStat className="clock-time">{timeLabel}</EcoStat>
            <div className="muted">{dateLabel}</div>
          </div>
        </EcoCard>
      </div>
    </XpWindow>
  );
}
