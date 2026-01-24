import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import DatabaseUnavailableCard from "../DatabaseUnavailableCard";
import ClientErrorFallback from "../ClientErrorFallback";

describe("eco fallbacks", () => {
  it("renders eco database unavailable card", () => {
    const html = renderToString(<DatabaseUnavailableCard />);
    expect(html).toContain("eco-card");
  });

  it("renders eco client error fallback", () => {
    const html = renderToString(<ClientErrorFallback />);
    expect(html).toContain("eco-card");
  });
});
