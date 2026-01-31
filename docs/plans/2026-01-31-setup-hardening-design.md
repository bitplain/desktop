# Setup Hardening Design

**Цель:** после завершения установки закрыть доступ к `/setup` и `/api/setup/*` (безопасность), добавить rate limiting для setup‑эндпоинтов.

## Контекст
- Сейчас `middleware.ts` пропускает весь `/api`, а `/setup` доступен всегда.
- `getSetupStatus()` читает `/data/config.json` и подключается к БД → требует Node runtime.
- Issue #31 требует: блокировать `/setup` и `/api/setup/*` после установки, добавить rate limit 3/мин, обновить README, покрыть тестами.

## Предлагаемая архитектура
1. **Перенос middleware в `proxy.ts` (Node runtime)**
   - Next.js 16 использует `proxy.ts` для Node‑runtime прокси (вместо edge middleware).
   - Это позволяет безопасно вызывать `getSetupStatus()` внутри прокси.

2. **Блокировка setup после завершения установки**
   - Если `getSetupStatus()` возвращает `ready` **или** `dbUnavailable`, то:
     - Любой запрос на `/setup*` → редирект на `/`.
     - Любой запрос на `/api/setup/*` → `404` JSON `{ error: "Setup completed" }`.
   - Доступ к `/setup` и `/api/setup/*` разрешён **только** при `needsSetup` или `needsAdmin`.

3. **Rate limiting (3 запроса/мин)**
   - Новый модуль `src/lib/rateLimiter.ts` (in‑memory).
   - Ключ: `ip + pathname`.
   - IP берём из `x-forwarded-for` → `x-real-ip` → `request.ip` → `unknown`.
   - Применение: **только** к `/api/setup/*` (UI не лимитируем, если не требуется иначе).
   - При превышении: `429` + `Retry-After`.

4. **Auth‑логика**
   - Текущий механизм `getToken` остаётся, но выполняется **после** проверки setup‑блокировки.

## Поведение по статусам
- `needsSetup`: `/setup` и `/api/setup/*` доступны.
- `needsAdmin`: `/setup/admin` и `/api/setup/*` доступны.
- `ready`: `/setup*` → redirect `/`, `/api/setup/*` → 404.
- `dbUnavailable`: **как ready** (закрываем setup во избежание эскалации).

## Файлы
- **Создать:** `src/lib/rateLimiter.ts`
- **Изменить:** `proxy.ts` (перенос логики из `middleware.ts` + защита setup)
- **Обновить:** `README.md` (описать блокировку setup и rate limit)
- **Тесты:** обновить/добавить тесты для `proxy` и `rateLimiter`

## Тестирование (минимум)
- `/setup` при `ready` → redirect `/`
- `/api/setup/*` при `ready` → 404 JSON
- `/setup` при `needsSetup` → доступен
- `/api/setup/*` при `needsAdmin` → доступен
- Rate limit: 4‑й запрос/мин → 429 + Retry‑After

## Риски и оговорки
- In‑memory rate limit сбрасывается при рестарте; для MVP это допустимо.
- При `dbUnavailable` блокируем setup ради безопасности; это может требовать админского вмешательства через инфраструктуру.

## Acceptance Criteria (из issue)
- [ ] `/setup` редирект на `/` после завершения установки
- [ ] `/api/setup/*` возвращает 404 после завершения установки
- [ ] Rate limiting 3/мин
- [ ] Тесты покрывают blocked access
- [ ] README обновлён
