import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";
import { EcoCard, EcoCardTitle, EcoNotice } from "@/components/ui/eco";

export default function AboutApp() {
  return (
    <XpWindow title="About Desktop">
      <div className="stack">
        <EcoCard>
          <EcoCardTitle>About Desktop</EcoCardTitle>
          <p className="muted">
            XP-десктоп с модульными приложениями. Работает локально и хранит
            настройки в базе данных и конфигурационном файле.
          </p>
        </EcoCard>
        <EcoNotice>Стек: Next.js + PostgreSQL + Prisma.</EcoNotice>
      </div>
    </XpWindow>
  );
}
