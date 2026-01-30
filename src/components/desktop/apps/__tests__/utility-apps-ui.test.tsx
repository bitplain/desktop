import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import NotepadApp from "../NotepadApp";
import ClockApp from "../ClockApp";
import CalculatorApp from "../CalculatorApp";
import AboutApp from "../AboutApp";
import VideoPlayerApp from "../VideoPlayerApp";

describe("utility apps", () => {
  it("renders eco primitives", () => {
    expect(renderToString(<NotepadApp />)).toContain('data-eco="card"');
    expect(renderToString(<ClockApp />)).toContain('data-eco="stat"');
    expect(renderToString(<CalculatorApp />)).toContain('data-eco="button"');
    expect(renderToString(<AboutApp />)).toContain('data-eco="notice"');
    expect(renderToString(<VideoPlayerApp />)).toContain('data-eco="card"');
  });
});
