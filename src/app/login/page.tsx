"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSettings } from "@/components/desktop/SettingsProvider";
import { handleLoginSuccessFlow } from "@/lib/authFlow";
import { getSetupRedirect } from "@/lib/setupRoutes";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function LoginPage() {
  const router = useRouter();
  const { playSound } = useSettings();
  const online = useNetworkStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Неверный email или пароль.");
        return;
      }

      handleLoginSuccessFlow({
        playSound,
        navigate: (path) => router.push(path),
      });
    } catch {
      setError("Ошибка сети. Проверь соединение.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
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
            <div className="auth-greeting-title">Добро пожаловать</div>
            <div className="auth-greeting-subtitle">
              Войдите, чтобы открыть рабочий стол.
            </div>
          </div>
        </aside>
        <section className="auth-form">
          <div className="auth-form-header">Авторизация</div>
          <form className="auth-form-body" onSubmit={onSubmit}>
            <input
              className="eco-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              className="eco-input"
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error ? <div className="notice">{error}</div> : null}
            {!online ? <div className="notice">Нет соединения.</div> : null}
            <button className="eco-button" type="submit" disabled={loading || !online}>
              {loading ? "Входим..." : "Войти"}
            </button>
            <p className="auth-hint">
              Нет аккаунта? <Link href="/register">Создать</Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
