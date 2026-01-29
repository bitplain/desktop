"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EcoButton, EcoForm, EcoInput, EcoNotice } from "@/components/ui/eco";
import { postJson } from "@/lib/http";
import { clearAdminDb, loadAdminDb, type AdminDbSession } from "@/lib/setupSession";
import { SetupShell } from "../SetupShell";

type ProvisionedInfo = {
  host: string;
  port: string;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
};

export default function SetupStepThreePage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminDbSession | null>(null);
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [dbSsl, setDbSsl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState<ProvisionedInfo | null>(null);

  useEffect(() => {
    const stored = loadAdminDb();
    if (!stored) {
      setError("Сначала введите данные администратора Postgres.");
      return;
    }
    setAdmin(stored);
    setDbSsl(stored.ssl);
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!admin) {
      setError("Нет данных администратора. Вернитесь на шаг назад.");
      return;
    }
    setLoading(true);
    setError(null);
    const response = await postJson("/api/setup/admin/provision", {
      adminHost: admin.host,
      adminPort: admin.port,
      adminUser: admin.user,
      adminPassword: admin.password,
      adminSsl: admin.ssl,
      dbName,
      dbUser,
      dbPassword,
      dbSsl,
    });
    if (!response.ok) {
      setError(String(response.data?.error || response.error || "Ошибка создания базы"));
      setLoading(false);
      return;
    }
    clearAdminDb();
    setProvisioned(response.data?.database ?? null);
    setLoading(false);
  };

  if (provisioned) {
    return (
      <SetupShell
        title="База готова"
        subtitle="Сохраните реквизиты для подключения."
        steps={["Старт", "Админ БД", "База приложения", "Администратор"]}
        activeStep={2}
      >
        <div className="auth-form-header">Данные подключения</div>
        <div className="setup-success-list">
          <div>Host: {provisioned.host}</div>
          <div>Port: {provisioned.port}</div>
          <div>Database: {provisioned.name}</div>
          <div>User: {provisioned.user}</div>
          <div>Password: {provisioned.password}</div>
          <div>SSL: {provisioned.ssl ? "on" : "off"}</div>
        </div>
        <div className="setup-actions">
          <EcoButton type="button" onClick={() => router.push("/setup/step-4")}>
            Далее
          </EcoButton>
        </div>
      </SetupShell>
    );
  }

  return (
    <SetupShell
      title="База приложения"
      subtitle="Создадим базу и пользователя для приложения."
      steps={["Старт", "Админ БД", "База приложения", "Администратор"]}
      activeStep={2}
    >
      <EcoForm className="auth-form-body" onSubmit={onSubmit}>
        <div className="auth-form-header">Параметры базы</div>
        <label className="setup-field">
          <span>Database name</span>
          <EcoInput value={dbName} onChange={(event) => setDbName(event.target.value)} required />
        </label>
        <label className="setup-field">
          <span>App user</span>
          <EcoInput value={dbUser} onChange={(event) => setDbUser(event.target.value)} required />
        </label>
        <label className="setup-field">
          <span>App password</span>
          <EcoInput
            type="password"
            value={dbPassword}
            onChange={(event) => setDbPassword(event.target.value)}
            required
          />
        </label>
        <label className="setup-field setup-field-inline">
          <span>SSL (самоподписанный)</span>
          <input type="checkbox" checked={dbSsl} onChange={(event) => setDbSsl(event.target.checked)} />
        </label>
        <div className="setup-note">
          Если сервер Postgres использует SSL с самоподписанным сертификатом, включите
          переключатель.
        </div>
        {error ? <EcoNotice>{error}</EcoNotice> : null}
        <div className="setup-actions">
          <EcoButton type="submit" disabled={loading}>
            {loading ? "Создаём..." : "Создать базу"}
          </EcoButton>
        </div>
      </EcoForm>
    </SetupShell>
  );
}
