import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { SetupShell } from "../SetupShell";

describe("setup shell", () => {
  it("renders title and layout", () => {
    const html = renderToString(
      <SetupShell title="Welcome">
        <div>Body</div>
      </SetupShell>
    );
    expect(html).toContain("Welcome");
    expect(html).toContain("auth-shell");
    expect(html).toContain("auth-card");
  });
});
