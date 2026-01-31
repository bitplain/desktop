import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SystemApp from "../SystemApp";

describe("SystemApp", () => {
  it("renders smb and ftp sections", () => {
    const html = renderToString(<SystemApp title="Настройки" />);
    expect(html).toContain("SMB");
    expect(html).toContain("FTP");
  });
});
