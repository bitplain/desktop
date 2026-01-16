export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Args) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      fn(...args);
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}
