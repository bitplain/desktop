type StatusBarProps = {
  itemsCount: number;
  selectedLabel: string | null;
  error: string | null;
};

export function StatusBar({ itemsCount, selectedLabel, error }: StatusBarProps) {
  return (
    <div className="cfm-status" aria-label="Status bar">
      <div>Items: {itemsCount}</div>
      <div className={`cfm-status-detail ${error ? "error" : ""}`}>
        {error ?? selectedLabel ?? "—"}
      </div>
    </div>
  );
}
