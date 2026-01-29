"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EcoButton, EcoForm, EcoInput, EcoNotice } from "@/components/ui/eco";
import { postJson } from "@/lib/http";
import { saveAdminDb } from "@/lib/setupSession";
import { SetupShell } from "../SetupShell";

export default function SetupStepTwoPage() {
  const router = useRouter();
  const [host, setHost] = useState("");
  const [port, setPort] = useState("5432");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [ssl, setSsl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await postJson("/api/setup/admin/check", {
      host,
      port,
      user,
      password,
      ssl,
    });
    if (!response.ok) {
      setError(String(response.data?.error || response.error || "Ошибка подключения"));
      setLoading(false);
      return;
    }
    saveAdminDb({ host, port, user, password, ssl });
    router.push("/setup/step-3");
  };

  return (
    <SetupShell
      title="Администратор Postgres"
      subtitle="Данные используются только один раз для создания базы."
      steps={["Старт", "Админ БД", "База приложения", "Администратор"]}
      activeStep={1}
    >
      <EcoForm className="auth-form-body" onSubmit={onSubmit}>
        <div className="auth-form-header">Подключение администратора</div>
        <label className="setup-field">
          <span>Host</span>
          <EcoInput value={host} onChange={(event) => setHost(event.target.value)} required />
        </label>
        <label className="setup-field">
          <span>Port</span>
          <EcoInput value={port} onChange={(event) => setPort(event.target.value)} required />
        </label>
        <label className="setup-field">
          <span>Admin user</span>
          <EcoInput value={user} onChange={(event) => setUser(event.target.value)} required />
        </label>
        <label className="setup-field">
          <span>Admin password</span>
          <EcoInput
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label className="setup-field setup-field-inline">
          <span>SSL (самоподписанный)</span>
          <input
            className="setup-checkbox"
            type="checkbox"
            checked={ssl}
            onChange={(event) => setSsl(event.target.checked)}
          />
        </label>
        <div className="setup-note">
          Включайте, если Postgres использует самоподписанный сертификат.
        </div>
        {error ? <EcoNotice>{error}</EcoNotice> : null}
        <div className="setup-actions">
          <EcoButton type="submit" disabled={loading}>
            {loading ? "Проверяем..." : "Далее"}
          </EcoButton>
        </div>
      </EcoForm>
    </SetupShell>
  );
}
