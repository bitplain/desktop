"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http";
import type { SetupStatus } from "@/lib/setupStatus";

type WizardProps = {
  initialStatus: Exclude<SetupStatus, "ready">;
};

type LayoutProps = {
  status: Exclude<SetupStatus, "ready">;
  email: string;
  password: string;
  databaseUrl: string;
  loading: boolean;
  error: string | null;
  success: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeDatabaseUrl: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onLogin: () => void;
};

export function SetupWizardLayout({
  status,
  email,
  password,
  databaseUrl,
  loading,
  error,
  success,
  onChangeEmail,
  onChangePassword,
  onChangeDatabaseUrl,
  onSubmit,
  onLogin,
}: LayoutProps) {
  const needsDatabase = status === "needsSetup";

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
            <div className="setup-step">1. Конфигурация и секреты</div>
            <div className="setup-step">2. Миграции базы</div>
            <div className="setup-step">3. Администратор</div>
          </div>
          <div className="setup-note">Секреты будут сгенерированы автоматически.</div>
        </div>
        <div className="login-form">
          {!success ? (
            <form className="stack" onSubmit={onSubmit}>
              <div className="login-form-header">Setup wizard</div>
              {needsDatabase ? (
                <label className="setup-field">
                  <span>DATABASE_URL</span>
                  <input
                    className="xp-input"
                    value={databaseUrl}
                    onChange={(event) => onChangeDatabaseUrl(event.target.value)}
                    placeholder="postgresql://user:pass@host/db"
                    required
                  />
                </label>
              ) : (
                <div className="setup-note">База уже настроена. Создайте администратора.</div>
              )}
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
              {error ? <div className="notice">{error}</div> : null}
              <button className="xp-button" type="submit" disabled={loading}>
                {loading ? "Настраиваем..." : "Запустить настройку"}
              </button>
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
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const payload = useMemo(
    () => ({ databaseUrl, email, password }),
    [databaseUrl, email, password]
  );

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
      email={email}
      password={password}
      databaseUrl={databaseUrl}
      loading={loading}
      error={error}
      success={success}
      onChangeEmail={setEmail}
      onChangePassword={setPassword}
      onChangeDatabaseUrl={setDatabaseUrl}
      onSubmit={onSubmit}
      onLogin={() => router.push("/login")}
    />
  );
}
