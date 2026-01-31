import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import StepTwo from "../step-2/page";
import StepThree from "../step-3/page";

describe("setup step checkbox styling", () => {
  it("adds checkbox class on step 2", () => {
    const html = renderToString(<StepTwo />);
    expect(html).toContain("setup-checkbox");
  });

  it("adds checkbox class on step 3", () => {
    const html = renderToString(<StepThree />);
    expect(html).toContain("setup-checkbox");
  });
});
