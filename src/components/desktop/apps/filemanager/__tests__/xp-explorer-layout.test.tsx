import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import FileManagerApp from "../../FileManagerApp";

describe("xp explorer layout", () => {
  it("renders chrome sections", () => {
    const html = renderToString(
      <FileManagerApp onOpenVideo={() => undefined} onOpenUploads={() => undefined} />
    );
    expect(html).toContain("Файл");
    expect(html).toContain("Адрес:");
    expect(html).toContain("Объектов");
  });
});
