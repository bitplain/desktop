import type { FileManagerEntry } from "./IconGrid";

type ContentViewProps = {
  entries: FileManagerEntry[];
  favorites: Set<string>;
  selectedPath: string | null;
  layout: "grid" | "list";
  onSelect: (path: string) => void;
  onOpen: (entry: FileManagerEntry) => void;
  onToggleFavorite: (entry: FileManagerEntry & { type: "file" }) => void;
};

export function ContentView({
  entries,
  favorites,
  selectedPath,
  layout,
  onSelect,
  onOpen,
  onToggleFavorite,
}: ContentViewProps) {
  return (
    <div className={`cfm-items ${layout}`} role="list">
      {entries.map((entry) => {
        const isSelected = selectedPath === entry.path;
        const isFavorite = favorites.has(entry.path);
        return (
          <div
            key={entry.path}
            role="button"
            tabIndex={0}
            className={`cfm-item ${isSelected ? "selected" : ""}`}
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
              className={`cfm-item-icon ${entry.type === "folder" ? "folder" : "file"}`}
              aria-hidden
            />
            <span className="cfm-item-name">{entry.name}</span>
            {entry.type === "file" ? (
              <button
                type="button"
                className={`cfm-item-favorite ${isFavorite ? "active" : ""}`}
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
