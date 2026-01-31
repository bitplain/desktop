"use client";

import { type ReactNode } from "react";
import { useWindowControls } from "@/components/desktop/WindowControlsContext";

type HeaderBarProps = {
  canGoBack: boolean;
  canGoForward: boolean;
  canDelete?: boolean;
  layout: "grid" | "list";
  favoritesActive?: boolean;
  onBack: () => void;
  onForward: () => void;
  onUp: () => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  onDelete: () => void;
  onOpenFavorites: () => void;
  onLayoutChange: (layout: "grid" | "list") => void;
  children?: ReactNode;
};

export function HeaderBar({
  canGoBack,
  canGoForward,
  canDelete,
  layout,
  favoritesActive,
  onBack,
  onForward,
  onUp,
  onCreateFolder,
  onUpload,
  onDelete,
  onOpenFavorites,
  onLayoutChange,
  children,
}: HeaderBarProps) {
  const controls = useWindowControls();
  const minimize = controls?.minimize ?? (() => undefined);
  const maximize = controls?.maximize ?? (() => undefined);
  const close = controls?.close ?? (() => undefined);

  return (
    <header className="cfm-header" aria-label="Toolbar">
      <div className="cfm-nav">
        <button
          type="button"
          className="cfm-nav-btn back"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Назад"
        />
        <button
          type="button"
          className="cfm-nav-btn forward"
          onClick={onForward}
          disabled={!canGoForward}
          aria-label="Вперед"
        />
        <button
          type="button"
          className="cfm-nav-btn up"
          onClick={onUp}
          aria-label="Вверх"
        />
      </div>

      <div className="cfm-header-center">{children}</div>

      <div className="cfm-actions">
        <button
          type="button"
          className="cfm-action-btn folder"
          onClick={onCreateFolder}
          aria-label="Создать папку"
        />
        <button
          type="button"
          className="cfm-action-btn upload"
          onClick={onUpload}
          aria-label="Загрузить"
        />
        <button
          type="button"
          className="cfm-action-btn delete"
          onClick={onDelete}
          aria-label="Удалить"
          disabled={!canDelete}
        />
        <button
          type="button"
          className={`cfm-action-btn favorite ${favoritesActive ? "active" : ""}`}
          onClick={onOpenFavorites}
          aria-label="Избранное"
        />
        <div className="cfm-view-toggle" role="group" aria-label="View">
          <button
            type="button"
            className={`cfm-action-btn grid ${layout === "grid" ? "active" : ""}`}
            onClick={() => onLayoutChange("grid")}
            aria-label="Сетка"
          />
          <button
            type="button"
            className={`cfm-action-btn list ${layout === "list" ? "active" : ""}`}
            onClick={() => onLayoutChange("list")}
            aria-label="Список"
          />
        </div>
      </div>

      <div className="cfm-window-controls" aria-label="Window controls">
        <button
          type="button"
          className="cfm-window-btn minimize"
          onClick={minimize}
          aria-label="Свернуть"
        />
        <button
          type="button"
          className="cfm-window-btn maximize"
          onClick={maximize}
          aria-label="Развернуть"
        />
        <button
          type="button"
          className="cfm-window-btn close"
          onClick={close}
          aria-label="Закрыть"
        />
      </div>
    </header>
  );
}
