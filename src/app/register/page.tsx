"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";
import { postJson } from "@/lib/http";
import { getSetupRedirect } from "@/lib/setupRoutes";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ICON_PATHS } from "@/lib/iconMap";

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
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-hero">
          <div className="login-brand">
            <span
              className="login-brand-icon"
              style={{ backgroundImage: `url(${ICON_PATHS.brandDesktop})` }}
              aria-hidden
            />
            <div>
              <div className="login-brand-title">Desktop</div>
              <div className="login-brand-subtitle">XP-workspace для модульных приложений</div>
            </div>
          </div>
          <div className="login-greeting">
            <div className="login-avatar" aria-hidden />
            <div className="login-greeting-title">Создайте учетную запись</div>
            <div className="login-greeting-subtitle">
              Заполните данные, чтобы открыть рабочий стол.
            </div>
          </div>
        </div>
        <div className="login-form">
          <div className="login-form-header">Регистрация</div>
          <form className="stack" onSubmit={onSubmit}>
            <input
              className="xp-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              className="xp-input"
              type="password"
              placeholder="Пароль (мин. 10 символов)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={10}
              required
            />
            <input
              className="xp-input"
              type="text"
              placeholder="Invite code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              required
            />
            <div className="muted">
              Пароль: 10+ символов, буквы в обоих регистрах, цифра и символ.
            </div>
            {error ? <div className="notice">{error}</div> : null}
            {message ? <div className="notice">{message}</div> : null}
            {!online ? <div className="notice">Нет соединения.</div> : null}
            <button className="xp-button" type="submit" disabled={loading || !online}>
              {loading ? "Создаю..." : "Создать"}
            </button>
            <p className="muted">
              Уже есть аккаунт? <Link href="/login">Войти</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
