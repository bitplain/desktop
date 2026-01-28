import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { SetupWizardLayout, getWizardInitialStep } from "../SetupWizard";

const baseProps = {
  status: "needsSetup" as const,
  step: "db" as const,
  email: "",
  password: "",
  dbHost: "",
  dbPort: "",
  dbUser: "",
  dbPassword: "",
  dbName: "",
  dbSsl: false,
  loading: false,
  error: null as string | null,
  success: false,
  onChangeEmail: () => undefined,
  onChangePassword: () => undefined,
  onChangeDbHost: () => undefined,
  onChangeDbPort: () => undefined,
  onChangeDbUser: () => undefined,
  onChangeDbPassword: () => undefined,
  onChangeDbName: () => undefined,
  onChangeDbSsl: () => undefined,
  onSubmit: () => undefined,
  onNext: () => undefined,
  onBack: () => undefined,
  onLogin: () => undefined,
};

describe("setup wizard layout", () => {
  it("renders host/port/user/password/db fields on db step", () => {
    const html = renderToString(<SetupWizardLayout {...baseProps} step="db" />);
    expect(html).toContain("setup-steps");
    expect(html).toContain("auth-form");
    expect(html).toContain('data-eco="card"');
    expect(html).toContain('data-eco="form"');
    expect(html).toContain("Host");
    expect(html).toContain("Port");
    expect(html).toContain("User");
    expect(html).toContain("Password");
    expect(html).toContain("Database");
    expect(html).toContain("SSL");
  });

  it("omits database name and secrets step", () => {
    const html = renderToString(<SetupWizardLayout {...baseProps} step="db" />);
    expect(html).not.toContain("Конфигурация и секреты");
  });

  it("renders database name field on db step", () => {
    const html = renderToString(<SetupWizardLayout {...baseProps} step="db" />);
    expect(html).toContain("Database");
  });

  it("shows next button on db step and submit on admin step", () => {
    const dbHtml = renderToString(<SetupWizardLayout {...baseProps} step="db" />);
    const adminHtml = renderToString(
      <SetupWizardLayout {...baseProps} step="admin" />
    );
    expect(dbHtml).toContain("Далее");
    expect(adminHtml).toContain("Запустить настройку");
  });

  it("shows database unavailable note on db step", () => {
    const html = renderToString(
      <SetupWizardLayout {...baseProps} status="dbUnavailable" step="db" />
    );
    expect(html).toContain("База недоступна");
  });
});

describe("setup wizard initial step", () => {
  it("starts on db step when dbUnavailable", () => {
    expect(getWizardInitialStep("dbUnavailable")).toBe("db");
  });
});
