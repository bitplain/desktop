"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http";
import type { SetupStatus } from "@/lib/setupStatus";

type WizardProps = {
  initialStatus: Exclude<SetupStatus, "ready">;
};

type WizardStep = "db" | "admin";

export function getWizardInitialStep(
  status: Exclude<SetupStatus, "ready">
): WizardStep {
  return status === "needsSetup" || status === "dbUnavailable" ? "db" : "admin";
}

type LayoutProps = {
  status: Exclude<SetupStatus, "ready">;
  step: WizardStep;
  email: string;
  password: string;
  dbHost: string;
  dbPort: string;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbSsl: boolean;
  loading: boolean;
  error: string | null;
  success: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeDbHost: (value: string) => void;
  onChangeDbPort: (value: string) => void;
  onChangeDbUser: (value: string) => void;
  onChangeDbPassword: (value: string) => void;
  onChangeDbName: (value: string) => void;
  onChangeDbSsl: (value: boolean) => void;
  onSubmit: (event: React.FormEvent) => void;
  onNext: () => void;
  onBack: () => void;
  onLogin: () => void;
};

export function SetupWizardLayout({
  status,
  step,
  email,
  password,
  dbHost,
  dbPort,
  dbUser,
  dbPassword,
  dbName,
  dbSsl,
  loading,
  error,
  success,
  onChangeEmail,
  onChangePassword,
  onChangeDbHost,
  onChangeDbPort,
  onChangeDbUser,
  onChangeDbPassword,
  onChangeDbName,
  onChangeDbSsl,
  onSubmit,
  onNext,
  onBack,
  onLogin,
}: LayoutProps) {
  return (
    <div className="login-screen">
      <div className="login-panel setup-panel">
        <div className="login-hero">
          <div className="login-brand">
            <span
              className="login-brand-icon"
              style={{ backgroundImage: "url(/icons/xp/window.png)" }}
              aria-hidden
            />
            <div>
              <div className="login-brand-title">Desktop</div>
              <div className="login-brand-subtitle">Первый запуск системы</div>
            </div>
          </div>
          <div className="setup-steps">
            <div className="setup-step">1. База данных</div>
            <div className="setup-step">2. Администратор</div>
          </div>
        </div>
        <div className="login-form">
          {!success ? (
            <form className="stack" onSubmit={onSubmit}>
              <div className="login-form-header">Setup wizard</div>
              {step === "db" ? (
                <div className="setup-db">
                  {status === "dbUnavailable" ? (
                    <div className="setup-note">
                      База недоступна. Проверьте параметры подключения.
                    </div>
                  ) : null}
                  <label className="setup-field">
                    <span>Host</span>
                    <input
                      className="xp-input"
                      value={dbHost}
                      onChange={(event) => onChangeDbHost(event.target.value)}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>Port</span>
                    <input
                      className="xp-input"
                      value={dbPort}
                      onChange={(event) => onChangeDbPort(event.target.value)}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>User</span>
                    <input
                      className="xp-input"
                      value={dbUser}
                      onChange={(event) => onChangeDbUser(event.target.value)}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>Password</span>
                    <input
                      className="xp-input"
                      type="password"
                      value={dbPassword}
                      onChange={(event) => onChangeDbPassword(event.target.value)}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>Database</span>
                    <input
                      className="xp-input"
                      value={dbName}
                      onChange={(event) => onChangeDbName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="setup-field setup-field-inline">
                    <span>SSL (самоподписанный)</span>
                    <input
                      type="checkbox"
                      checked={dbSsl}
                      onChange={(event) => onChangeDbSsl(event.target.checked)}
                    />
                  </label>
                </div>
              ) : (
                <>
                  {status === "needsAdmin" ? (
                    <div className="setup-note">База уже настроена. Создайте администратора.</div>
                  ) : null}
                  <label className="setup-field">
                    <span>Email администратора</span>
                    <input
                      className="xp-input"
                      type="email"
                      value={email}
                      onChange={(event) => onChangeEmail(event.target.value)}
                      required
                    />
                  </label>
                  <label className="setup-field">
                    <span>Пароль администратора</span>
                    <input
                      className="xp-input"
                      type="password"
                      value={password}
                      onChange={(event) => onChangePassword(event.target.value)}
                      required
                    />
                  </label>
                </>
              )}
              {error ? <div className="notice">{error}</div> : null}
              <div className="setup-actions">
                {step === "admin" && status === "needsSetup" ? (
                  <button className="xp-button secondary" type="button" onClick={onBack}>
                    Назад
                  </button>
                ) : null}
                {step === "db" ? (
                  <button className="xp-button" type="button" onClick={onNext}>
                    Далее
                  </button>
                ) : (
                  <button className="xp-button" type="submit" disabled={loading}>
                    {loading ? "Настраиваем..." : "Запустить настройку"}
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="setup-success">
              <div className="login-form-header">Готово</div>
              <div className="setup-success-list">
                <div>Конфигурация сохранена</div>
                <div>База данных подготовлена</div>
                <div>Администратор создан</div>
              </div>
              <button className="xp-button" onClick={onLogin}>
                Войти
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetupWizard({ initialStatus }: WizardProps) {
  const router = useRouter();
  const [status] = useState(initialStatus);
  const [step, setStep] = useState<WizardStep>(getWizardInitialStep(initialStatus));
  const [dbHost, setDbHost] = useState("");
  const [dbPort, setDbPort] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbSsl, setDbSsl] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const payload = useMemo(
    () => ({
      dbHost,
      dbPort,
      dbUser,
      dbPassword,
      dbName,
      dbSsl,
      email,
      password,
    }),
    [dbHost, dbPort, dbUser, dbPassword, dbName, dbSsl, email, password]
  );

  const onNext = () => {
    setError(null);
    if (
      !dbHost.trim() ||
      !dbPort.trim() ||
      !dbUser.trim() ||
      !dbPassword.trim() ||
      !dbName.trim()
    ) {
      setError("Заполните все поля базы данных.");
      return;
    }
    setStep("admin");
  };

  const onBack = () => {
    setError(null);
    setStep("db");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await postJson("/api/setup/complete", payload);
    if (!result.ok) {
      const message = result.data?.error || "Ошибка настройки.";
      setError(message);
      setLoading(false);
      return;
    }
    setLoading(false);
    setSuccess(true);
  };

  return (
    <SetupWizardLayout
      status={status}
      step={step}
      email={email}
      password={password}
      dbHost={dbHost}
      dbPort={dbPort}
      dbUser={dbUser}
      dbPassword={dbPassword}
      dbName={dbName}
      dbSsl={dbSsl}
      loading={loading}
      error={error}
      success={success}
      onChangeEmail={setEmail}
      onChangePassword={setPassword}
      onChangeDbHost={setDbHost}
      onChangeDbPort={setDbPort}
      onChangeDbUser={setDbUser}
      onChangeDbPassword={setDbPassword}
      onChangeDbName={setDbName}
      onChangeDbSsl={setDbSsl}
      onSubmit={onSubmit}
      onNext={onNext}
      onBack={onBack}
      onLogin={() => router.push("/login")}
    />
  );
}
