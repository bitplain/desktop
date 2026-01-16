export default function AboutApp() {
  return (
    <div className="stack">
      <div className="panel-title">About Desktop</div>
      <p className="muted">
        XP-десктоп с модульными приложениями. Работает локально и хранит
        настройки в базе данных и конфигурационном файле.
      </p>
      <div className="notice">Стек: Next.js + PostgreSQL + Prisma.</div>
    </div>
  );
}
