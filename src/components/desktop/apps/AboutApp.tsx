import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";

export default function AboutApp() {
  return (
    <XpWindow title="About Desktop">
      <div className="stack">
        <div className="eco-card">
          <div className="eco-card-title">About Desktop</div>
          <p className="muted">
            XP-десктоп с модульными приложениями. Работает локально и хранит
            настройки в базе данных и конфигурационном файле.
          </p>
        </div>
        <div className="notice eco-notice">Стек: Next.js + PostgreSQL + Prisma.</div>
      </div>
    </XpWindow>
  );
}
