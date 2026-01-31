type PathBarProps = {
  userLabel: string;
  path: string;
  onNavigate: (path: string) => void;
};

type Crumb = {
  label: string;
  path: string;
};

export function PathBar({ userLabel, path, onNavigate }: PathBarProps) {
  const segments = path.split("/").filter(Boolean);
  const crumbs: Crumb[] = [
    { label: "Home", path: "" },
    { label: userLabel, path: "" },
  ];

  segments.forEach((segment, index) => {
    const nextPath = segments.slice(0, index + 1).join("/");
    crumbs.push({ label: segment, path: nextPath });
  });

  return (
    <nav className="cfm-pathbar" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${crumb.path || "root"}`} className="cfm-crumb">
            <button
              type="button"
              className={`cfm-crumb-btn ${isLast ? "active" : ""}`}
              onClick={() => onNavigate(crumb.path)}
              disabled={isLast}
            >
              {crumb.label}
            </button>
            {isLast ? null : <span className="cfm-crumb-sep">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
