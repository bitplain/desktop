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
  entries: FileManagerEntry[];
  favorites: Set<string>;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onOpen: (entry: FileManagerEntry) => void;
  onToggleFavorite: (entry: FileManagerEntry & { type: "file" }) => void;
};

export function IconGrid({
  entries,
  favorites,
  selectedPath,
  onSelect,
  onOpen,
  onToggleFavorite,
}: IconGridProps) {
  return (
    <div className="grid">
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
