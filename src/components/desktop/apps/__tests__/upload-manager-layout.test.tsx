import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { UploadManagerLayout } from "../UploadManagerApp";

describe("upload manager layout", () => {
  it("renders upload items", () => {
    const html = renderToString(
      <UploadManagerLayout
        uploads={[{ id: "1", name: "a.mp4", progress: 50, status: "uploading" }]}
      />
    );
    expect(html).toContain("Загрузки");
    expect(html).toContain("a.mp4");
    expect(html).toContain("eco-upload-list");
  });
});
