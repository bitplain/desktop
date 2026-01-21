import type { FileManagerView } from "./TaskPane";

export type FileManagerEntry =
  | {
      type: "folder";
      name: string;
      path: string;
    }
  | {
      type: "file";
      name: string;
      path: string;
    };

type IconGridProps = {
  view: FileManagerView;
  entries: FileManagerEntry[];
  favorites: Set<string>;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onOpen: (entry: FileManagerEntry) => void;
  onToggleFavorite: (entry: FileManagerEntry & { type: "file" }) => void;
  onOpenFavorites: () => void;
  onOpenVideo: () => void;
};

export function IconGrid({
  view,
  entries,
  favorites,
  selectedPath,
  onSelect,
  onOpen,
  onToggleFavorite,
  onOpenFavorites,
  onOpenVideo,
}: IconGridProps) {
  return (
    <div className="grid">
      <div
        role="button"
        tabIndex={0}
        className={`item ${view === "favorites" ? "selected" : ""}`}
        onDoubleClick={onOpenFavorites}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenFavorites();
          }
        }}
      >
        <span className="icon favorite" aria-hidden />
        <span className="label">Избранное</span>
      </div>

      {view === "root" ? (
        <div
          role="button"
          tabIndex={0}
          className="item"
          onDoubleClick={onOpenVideo}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenVideo();
            }
          }}
        >
          <span className="icon folder" aria-hidden />
          <span className="label">Видео</span>
        </div>
      ) : null}

      {entries.map((entry) => {
        const isSelected = selectedPath === entry.path;
        const isFavorite = favorites.has(entry.path);
        return (
          <div
            key={entry.path}
            role="button"
            tabIndex={0}
            className={`item ${isSelected ? "selected" : ""}`}
            onClick={() => onSelect(entry.path)}
            onDoubleClick={() => onOpen(entry)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(entry);
              }
            }}
          >
            <span
              className={`icon ${entry.type === "folder" ? "folder" : "video"}`}
              aria-hidden
            />
            <span className="label">{entry.name}</span>
            {entry.type === "file" ? (
              <button
                type="button"
                className={`favorite-star ${isFavorite ? "active" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(entry);
                }}
                aria-label={
                  isFavorite ? "Удалить из избранного" : "Добавить в избранное"
                }
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
