"use client";

import { useWindowControls } from "@/components/desktop/WindowControlsContext";

export function XpTitlebar({ title }: { title: string }) {
  const controls = useWindowControls();
  const minimize = controls?.minimize ?? (() => undefined);
  const maximize = controls?.maximize ?? (() => undefined);
  const close = controls?.close ?? (() => undefined);

  return (
    <div className="cfm-header cfm-header--app cfm-app-header">
      <div className="cfm-app-title">
        <span className="cfm-app-icon" aria-hidden="true" />
        <span className="cfm-app-name">{title}</span>
      </div>
      <div className="cfm-window-controls" aria-label="Window controls">
        <button
          type="button"
          className="cfm-window-btn minimize"
          aria-label="Свернуть"
          onClick={minimize}
        />
        <button
          type="button"
          className="cfm-window-btn maximize"
          aria-label="Развернуть"
          onClick={maximize}
        />
        <button
          type="button"
          className="cfm-window-btn close"
          aria-label="Закрыть"
          onClick={close}
        />
      </div>
    </div>
  );
}
