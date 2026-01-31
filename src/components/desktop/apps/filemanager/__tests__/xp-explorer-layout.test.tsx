import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import FileManagerApp from "../../FileManagerApp";

describe("xp explorer layout", () => {
  it("renders chrome sections", () => {
    const html = renderToString(
      <FileManagerApp
        onOpenVideo={() => undefined}
        onOpenUploads={() => undefined}
        userEmail="user@example.com"
      />
    );
    expect(html).toContain("Home");
    expect(html).toContain("Desktop");
    expect(html).toContain("Items:");
  });
});
