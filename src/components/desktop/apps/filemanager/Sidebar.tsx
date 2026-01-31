type SidebarItem = {
  key: string;
  label: string;
  icon: string;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "desktop", label: "Desktop", icon: "desktop" },
  { key: "documents", label: "Documents", icon: "documents" },
  { key: "downloads", label: "Downloads", icon: "downloads" },
  { key: "music", label: "Music", icon: "music" },
  { key: "pictures", label: "Pictures", icon: "pictures" },
  { key: "videos", label: "Videos", icon: "videos" },
  { key: "trash", label: "Trash", icon: "trash" },
];

const DRIVES = [
  "31.5 GiB Hard Drive",
  "Debian Cutefish",
  "Basic data partition",
  "104.2 GiB Hard Drive",
];

type SidebarProps = {
  activeKey: string;
  onNavigate: (path: string) => void;
  onOpenFavorites: () => void;
};

export function Sidebar({ activeKey, onNavigate, onOpenFavorites }: SidebarProps) {
  return (
    <aside className="cfm-sidebar" aria-label="Sidebar">
      <div className="cfm-side-list">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`cfm-side-item ${activeKey === item.key ? "active" : ""}`}
            onClick={() => onNavigate("")}
          >
            <span className={`cfm-side-icon ${item.icon}`} aria-hidden="true" />
            <span className="cfm-side-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="cfm-side-section">Drives</div>
      <div className="cfm-side-drives">
        {DRIVES.map((drive) => (
          <button
            key={drive}
            type="button"
            className="cfm-side-drive"
            onClick={() => onNavigate("")}
          >
            <span className="cfm-side-icon drive" aria-hidden="true" />
            <span className="cfm-side-label">{drive}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="cfm-side-favorites"
        onClick={onOpenFavorites}
      >
        <span className="cfm-side-icon favorite" aria-hidden="true" />
        <span className="cfm-side-label">Favorites</span>
      </button>
    </aside>
  );
}
