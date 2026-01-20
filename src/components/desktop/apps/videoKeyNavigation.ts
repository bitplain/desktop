type KeyEvent = { key: string };

type KeyTarget = {
  addEventListener: (type: string, listener: (event: KeyEvent) => void) => void;
  removeEventListener: (type: string, listener: (event: KeyEvent) => void) => void;
};

type KeyHandlers = {
  onNext: () => void;
  onPrevious: () => void;
};

export function attachVideoKeyNavigation(target: KeyTarget, handlers: KeyHandlers) {
  const handler = (event: KeyEvent) => {
    if (event.key === "ArrowRight") {
      handlers.onNext();
    }
    if (event.key === "ArrowLeft") {
      handlers.onPrevious();
    }
  };

  target.addEventListener("keydown", handler);
  return () => {
    target.removeEventListener("keydown", handler);
  };
}
