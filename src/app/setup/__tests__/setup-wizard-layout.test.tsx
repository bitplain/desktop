import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { SetupWizardLayout } from "../SetupWizard";

const baseProps = {
  status: "needsSetup" as const,
  email: "",
  password: "",
  databaseUrl: "",
  loading: false,
  error: null as string | null,
  success: false,
  onChangeEmail: () => undefined,
  onChangePassword: () => undefined,
  onChangeDatabaseUrl: () => undefined,
  onSubmit: () => undefined,
  onLogin: () => undefined,
};

describe("setup wizard layout", () => {
  it("renders database url field for needsSetup", () => {
    const html = renderToString(<SetupWizardLayout {...baseProps} />);
    expect(html).toContain("DATABASE_URL");
  });

  it("hides database url field for needsAdmin", () => {
    const html = renderToString(
      <SetupWizardLayout {...baseProps} status="needsAdmin" />
    );
    expect(html).not.toContain("DATABASE_URL");
  });
});
