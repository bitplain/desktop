export const dynamic = "force-dynamic";

import Link from "next/link";
import { SetupShell } from "../SetupShell";

export default function SetupStepOnePage() {
  return (
    <SetupShell
      title="Добро пожаловать"
      subtitle="Подготовим базу данных и создадим администратора."
      steps={["Старт", "Админ БД", "База приложения", "Администратор"]}
      activeStep={0}
    >
      <div className="auth-form-header">Первичная настройка</div>
      <div className="auth-hint">
        Настройка займёт пару минут. Данные администратора Postgres нигде не
        сохраняются.
      </div>
      <div className="setup-actions">
        <Link className="eco-button" data-eco="button" href="/setup/step-2">
          Приступить
        </Link>
      </div>
    </SetupShell>
  );
}
