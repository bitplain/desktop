import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SystemApp from "../SystemApp";

describe("SystemApp", () => {
  it("renders storage panel", () => {
    const html = renderToString(<SystemApp title="Настройки" />);
    expect(html).toContain("Файловая шара");
  });
});
