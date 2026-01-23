"use client";

import { useEffect, useState } from "react";
import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";

const STORAGE_KEY = "desktop.notepad";

export default function NotepadApp() {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, value);
  }, [value]);

  return (
    <XpWindow title="Notepad">
      <div className="stack">
        <div className="eco-card">
          <div className="eco-card-title">Notepad</div>
          <textarea
            className="eco-textarea"
            rows={10}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ваши заметки..."
          />
        </div>
      </div>
    </XpWindow>
  );
}
