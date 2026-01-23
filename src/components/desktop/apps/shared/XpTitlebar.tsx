"use client";

import { useWindowControls } from "@/components/desktop/WindowControlsContext";

export function XpTitlebar({ title }: { title: string }) {
  const controls = useWindowControls();
  const minimize = controls?.minimize ?? (() => undefined);
  const maximize = controls?.maximize ?? (() => undefined);
  const close = controls?.close ?? (() => undefined);

  return (
    <div className="titlebar">
      <div className="title-left">
        <div className="app-icon" aria-hidden="true" />
        <div className="title">{title}</div>
      </div>
      <div className="win-buttons">
        <button className="win-btn" type="button" aria-label="Свернуть" onClick={minimize}>
          _
        </button>
        <button
          className="win-btn"
          type="button"
          aria-label="Развернуть"
          onClick={maximize}
        >
          □
        </button>
        <button className="win-btn close" type="button" aria-label="Закрыть" onClick={close}>
          X
        </button>
      </div>
    </div>
  );
}
