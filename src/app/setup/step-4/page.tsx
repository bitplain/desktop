"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EcoButton, EcoForm, EcoInput, EcoNotice } from "@/components/ui/eco";
import { postJson } from "@/lib/http";
import { SetupShell } from "../SetupShell";

export default function SetupStepFourPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    setLoading(true);
    setError(null);
    const response = await postJson("/api/setup/complete", {
      email,
      password,
    });
    if (!response.ok) {
      setError(String(response.data?.error || response.error || "Ошибка создания администратора"));
      setLoading(false);
      return;
    }
    router.push("/login");
  };

  return (
    <SetupShell
      title="Администратор"
      subtitle="Создайте учётную запись администратора приложения."
      steps={["Старт", "Админ БД", "База приложения", "Администратор"]}
      activeStep={3}
    >
      <EcoForm className="auth-form-body" onSubmit={onSubmit}>
        <div className="auth-form-header">Администратор приложения</div>
        <label className="setup-field">
          <span>Email администратора</span>
          <EcoInput
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="setup-field">
          <span>Пароль администратора</span>
          <EcoInput
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label className="setup-field">
          <span>Повторите пароль</span>
          <EcoInput
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </label>
        {error ? <EcoNotice>{error}</EcoNotice> : null}
        <div className="setup-actions">
          <EcoButton type="submit" disabled={loading}>
            {loading ? "Создаём..." : "Готово"}
          </EcoButton>
        </div>
      </EcoForm>
    </SetupShell>
  );
}
