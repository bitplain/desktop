export function parseRange(range: string | null, size: number) {
  if (!range) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return null;
  }
  return { start, end };
}
