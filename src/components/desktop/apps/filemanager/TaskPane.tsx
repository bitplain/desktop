import { ReactNode } from "react";

export type FileManagerView = "video" | "favorites" | "root";

type TaskPaneProps = {
  view: FileManagerView;
  loading: boolean;
  error: string | null;
  selectedLabel: string | null;
  onViewChange: (view: FileManagerView) => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  onDelete: () => void;
};

function TaskLink({
  children,
  active,
  disabled,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`xp-task-link ${active ? "active" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function TaskPane({
  view,
  loading,
  error,
  selectedLabel,
  onViewChange,
  onCreateFolder,
  onUpload,
  onDelete,
}: TaskPaneProps) {
  const hasSelection = Boolean(selectedLabel);
  return (
    <div className="xp-taskpane">
      <div className="xp-task-group">
        <div className="xp-task-title">Системные задачи</div>
        <div className="xp-task-list">
          <TaskLink>Скрыть содержимое этой папки</TaskLink>
          <TaskLink>Просмотреть информацию</TaskLink>
          <TaskLink>Панель управления</TaskLink>
        </div>
      </div>

      <div className="xp-task-group">
        <div className="xp-task-title">Задачи для файлов и папок</div>
        <div className="xp-task-list">
          <TaskLink onClick={onCreateFolder}>Создать папку</TaskLink>
          <TaskLink onClick={onUpload}>Добавить файл</TaskLink>
          <TaskLink onClick={onDelete} disabled={!hasSelection}>
            Удалить
          </TaskLink>
        </div>
      </div>

      <div className="xp-task-group">
        <div className="xp-task-title">Другие места</div>
        <div className="xp-task-list">
          <TaskLink active={view === "video"} onClick={() => onViewChange("video")}>
            Видео
          </TaskLink>
          <TaskLink
            active={view === "favorites"}
            onClick={() => onViewChange("favorites")}
          >
            Избранное
          </TaskLink>
          <TaskLink active={view === "root"} onClick={() => onViewChange("root")}>
            Корень
          </TaskLink>
        </div>
      </div>

      <div className="xp-task-group details">
        <div className="xp-task-title">Подробно</div>
        <div className="xp-task-details">
          <div>{loading ? "Загрузка..." : "Готово"}</div>
          {error ? <div className="xp-task-error">{error}</div> : null}
          <div>{selectedLabel ? `Выбрано: ${selectedLabel}` : "Ничего не выбрано"}</div>
        </div>
      </div>
    </div>
  );
}
