export type IconItem = {
  label: string;
  variant?: string;
};

export function sortIconsByLabel<T extends IconItem>(icons: T[]) {
  return [...icons].sort((a, b) => a.label.localeCompare(b.label, "ru"));
}

export function groupIconsByCategory<T extends IconItem>(icons: T[]) {
  const groups = new Map<string, T[]>();
  for (const icon of icons) {
    const key = icon.variant ?? "default";
    const bucket = groups.get(key) ?? [];
    bucket.push(icon);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({ category, items }));
}

export function computeVirtualRows(
  viewHeight: number,
  rowHeight: number,
  icons: IconItem[],
  options?: { columns?: number; scrollTop?: number; overscan?: number }
) {
  const columns = Math.max(1, options?.columns ?? 1);
  const overscan = options?.overscan ?? 1;
  const scrollTop = options?.scrollTop ?? 0;
  const totalRows = Math.ceil(icons.length / columns);
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(
    Math.max(totalRows - 1, 0),
    Math.ceil((scrollTop + viewHeight) / rowHeight) + overscan
  );
  const startIndex = startRow * columns;
  const endIndex = Math.min(icons.length - 1, (endRow + 1) * columns - 1);
  const topSpacerHeight = startRow * rowHeight;
  const bottomSpacerHeight = Math.max(0, (totalRows - endRow - 1) * rowHeight);

  return {
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight,
    totalRows,
  };
}
