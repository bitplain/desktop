"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";
import { EcoButton, EcoCard, EcoForm, EcoInput, EcoNotice } from "@/components/ui/eco";
import { postJson } from "@/lib/http";
import { getSetupRedirect } from "@/lib/setupRoutes";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function RegisterPage() {
  const { playSound } = useSettings();
  const online = useNetworkStatus();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const checkSetup = async () => {
      const response = await fetch("/api/setup/status");
      const data = await response.json().catch(() => null);
      if (!active || !data?.status) {
        return;
      }
      const target = getSetupRedirect(data.status);
      if (target) {
        router.replace(target);
      }
    };
    void checkSetup();
    return () => {
      active = false;
    };
  }, [router]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    playSound("click");
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await postJson("/api/register", {
        email,
        password,
        inviteCode,
      });

      if (!result.ok) {
        const errorMessage =
          result.data.error ||
          (result.error ? "Ошибка сети. Проверь соединение." : "Ошибка регистрации.");
        setError(errorMessage);
        return;
      }

      setMessage("Аккаунт создан. Теперь войдите.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <EcoCard className="auth-card">
        <aside className="auth-hero">
          <div className="auth-brand">
            <span
              className="auth-brand-icon"
              style={{ backgroundImage: "url(/icons/xp/window.png)" }}
              aria-hidden
            />
            <div>
              <div className="auth-brand-title">Desktop</div>
              <div className="auth-brand-subtitle">XP-workspace для модульных приложений</div>
            </div>
          </div>
          <div className="auth-greeting">
            <div className="auth-avatar" aria-hidden />
            <div className="auth-greeting-title">Создайте учетную запись</div>
            <div className="auth-greeting-subtitle">
              Заполните данные, чтобы открыть рабочий стол.
            </div>
          </div>
        </aside>
        <section className="auth-form">
          <div className="auth-form-header">Регистрация</div>
          <EcoForm className="auth-form-body" onSubmit={onSubmit}>
            <EcoInput
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <EcoInput
              type="password"
              placeholder="Пароль (мин. 10 символов)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={10}
              required
            />
            <EcoInput
              type="text"
              placeholder="Invite code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              required
            />
            <div className="auth-hint">
              Пароль: 10+ символов, буквы в обоих регистрах, цифра и символ.
            </div>
            {error ? <EcoNotice>{error}</EcoNotice> : null}
            {message ? <EcoNotice>{message}</EcoNotice> : null}
            {!online ? <EcoNotice>Нет соединения.</EcoNotice> : null}
            <EcoButton type="submit" disabled={loading || !online}>
              {loading ? "Создаю..." : "Создать"}
            </EcoButton>
            <p className="auth-hint">
              Уже есть аккаунт? <Link href="/login">Войти</Link>
            </p>
          </EcoForm>
        </section>
      </EcoCard>
    </div>
  );
}
