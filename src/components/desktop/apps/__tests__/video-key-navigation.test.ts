import { describe, expect, it } from "vitest";
import { attachVideoKeyNavigation } from "../videoKeyNavigation";

type Handler = (event: { key: string }) => void;

class FakeTarget {
  handler: Handler | null = null;

  addEventListener(type: string, handler: Handler) {
    if (type === "keydown") {
      this.handler = handler;
    }
  }

  removeEventListener(type: string, handler: Handler) {
    if (type === "keydown" && this.handler === handler) {
      this.handler = null;
    }
  }

  dispatch(event: { key: string }) {
    this.handler?.(event);
  }
}

describe("video key navigation", () => {
  it("moves next and previous on arrow keys", () => {
    const target = new FakeTarget();
    let next = 0;
    let prev = 0;

    const cleanup = attachVideoKeyNavigation(target, {
      onNext: () => {
        next += 1;
      },
      onPrevious: () => {
        prev += 1;
      },
    });

    target.dispatch({ key: "ArrowRight" });
    target.dispatch({ key: "ArrowLeft" });

    expect(next).toBe(1);
    expect(prev).toBe(1);

    cleanup();
    target.dispatch({ key: "ArrowRight" });
    expect(next).toBe(1);
  });

  it("toggles playback on space", () => {
    const target = new FakeTarget();
    let toggles = 0;

    const cleanup = attachVideoKeyNavigation(target, {
      onNext: () => undefined,
      onPrevious: () => undefined,
      onToggle: () => {
        toggles += 1;
      },
    });

    target.dispatch({ key: " " });

    expect(toggles).toBe(1);

    cleanup();
  });
});
