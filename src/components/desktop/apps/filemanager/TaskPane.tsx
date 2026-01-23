import { ReactNode } from "react";
import { EcoTaskPane } from "@/components/ui/eco";

export type FileManagerView = "video" | "favorites" | "root";

type TaskPaneProps = {
  className?: string;
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
      className={`task-link ${active ? "active" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="bullet" aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

export function TaskPane({
  className,
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
  const rootClassName = ["task-pane", className].filter(Boolean).join(" ");
  return (
    <EcoTaskPane className={rootClassName}>
      <div className="task-group">
        <div className="task-header">Системные задачи</div>
        <div className="task-body">
          <TaskLink>Скрыть содержимое этой папки</TaskLink>
          <TaskLink>Просмотреть информацию</TaskLink>
          <TaskLink>Панель управления</TaskLink>
        </div>
      </div>

      <div className="task-group">
        <div className="task-header">Задачи для файлов и папок</div>
        <div className="task-body">
          <TaskLink onClick={onCreateFolder}>Создать новую папку</TaskLink>
          <TaskLink onClick={onUpload}>Добавить файл</TaskLink>
          <TaskLink onClick={onDelete} disabled={!hasSelection}>
            Удалить
          </TaskLink>
        </div>
      </div>

      <div className="task-group">
        <div className="task-header">Другие места</div>
        <div className="task-body">
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

      <div className="task-group">
        <div className="task-header">Подробно</div>
        <div className="task-body">
          <div className="details">
            <div>{loading ? "Загрузка..." : "Готово"}</div>
            {error ? <div className="details-error">{error}</div> : null}
            <div>
              {selectedLabel ? `Выбрано: ${selectedLabel}` : "Ничего не выбрано"}
            </div>
          </div>
        </div>
      </div>
    </EcoTaskPane>
  );
}
