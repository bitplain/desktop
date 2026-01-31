# FTP storage integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** добавить FTP как активный источник файлов, хранить оба подключения (SMB/FTP) и переключать активный провайдер, а в настройках — аккордеон с секциями SMB/FTP.

**Architecture:** две записи `StorageConnection` на пользователя (по provider), поле `User.activeStorageProvider` определяет источник. File Manager использует активный провайдер (FTP имеет `subPath`, чтобы папка `video` показывала содержимое `ftp://host/subPath`).

**Tech Stack:** Next.js API routes, Prisma, TypeScript, vitest. FTP‑клиент (нужна зависимость, например `basic-ftp`).

---

### Task 1: Обновить Prisma схему и миграции

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_storage_provider_ftp/migration.sql`

**Step 1: Write the failing test**

Добавить тест на сериализацию подключения, учитывающую provider:
```ts
import { describe, expect, it } from "vitest";
import { serializeStorageConnection } from "@/lib/storage/connection";

it("serializes ftp provider", () => {
  expect(
    serializeStorageConnection({
      provider: "FTP",
      host: "10.0.0.1",
      share: "",
      subPath: "video",
      username: "user",
      passwordEncrypted: "secret",
      port: 21,
    })
  ).toEqual({
    provider: "FTP",
    host: "10.0.0.1",
    share: "",
    subPath: "video",
    username: "user",
    port: 21,
    hasPassword: true,
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/smb-connection.test.ts`
Expected: FAIL (provider FTP / port unsupported).

**Step 3: Update Prisma schema**
- Добавить `FTP` в enum `StorageProvider`.
- В `StorageConnection`:
  - заменить `@@unique([userId])` на `@@unique([userId, provider])`.
  - добавить `port Int?` (для FTP).
  - сделать `share` необязательным для FTP (оставить строку, но валидировать на уровне API).
- В `User` добавить `activeStorageProvider StorageProvider?`.

**Step 4: Add migration SQL**
- Drop unique index по `userId`, добавить новый по `(userId, provider)`.
- Добавить колонку `activeStorageProvider` в `User`.
- Добавить колонку `port` в `StorageConnection` (nullable).

**Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/smb-connection.test.ts`
Expected: PASS.

**Step 6: Commit**
```bash
git add prisma/schema.prisma prisma/migrations src/lib/__tests__/smb-connection.test.ts src/lib/storage/connection.ts

git commit -m "feat: support ftp storage provider in schema"
```

---

### Task 2: Обновить storage connection API и выбор активного провайдера

**Files:**
- Modify: `src/app/api/storage/connection/route.ts`
- Modify: `src/lib/filemanager/api.ts`
- Modify: `src/lib/storage/connection.ts`
- Modify: `src/lib/storage/types.ts`

**Step 1: Write the failing test**

Добавить тест, что `getStorageContext` выбирает активного провайдера (минимальный тест‑хелпер, без реальной БД, через вынос функции выбора).

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/storage-provider.test.ts`
Expected: FAIL.

**Step 3: Implement minimal changes**
- `serializeStorageConnection` расширить: поддержка `FTP` + `port`.
- `GET /api/storage/connection` возвращает `{ activeProvider, smb?: ..., ftp?: ... }`.
- `POST /api/storage/connection` принимает `provider` и сохраняет запись для этого провайдера; выставляет `activeStorageProvider` у пользователя.
- `DELETE /api/storage/connection?provider=...` удаляет только выбранного провайдера; если он был активным — сбрасывает `activeStorageProvider`.
- `getStorageContext` берёт активного провайдера и использует нужный провайдер.

**Step 4: Run tests**

Run: `npm test -- src/lib/__tests__/storage-provider.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/app/api/storage/connection/route.ts src/lib/filemanager/api.ts src/lib/storage/connection.ts src/lib/storage/types.ts src/lib/__tests__/storage-provider.test.ts

git commit -m "feat: support active storage provider"
```

---

### Task 3: Добавить FTP провайдер

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/storage/ftpProvider.ts`

**Step 0: Approval**
Нужна явная команда на добавление зависимости FTP (например `basic-ftp`).

**Step 1: Write the failing test**

Тест на helper‑маппинг пути (в `ftpProvider`), чтобы корень `video` корректно маппился на `subPath`:
```ts
import { describe, expect, it } from "vitest";
import { buildFtpPath } from "@/lib/storage/ftpProvider";

it("maps video root to ftp subPath", () => {
  expect(buildFtpPath("video", "video")).toBe("video");
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/ftp-provider.test.ts`
Expected: FAIL.

**Step 3: Implement minimal provider**
- `buildFtpPath` использует `stripVideoPrefix` + `subPath`.
- Реализовать `list/stat/createReadStream/writeFile/createFolder/deleteFile/deleteFolder` через выбранную FTP библиотеку (минимально).

**Step 4: Run tests**

Run: `npm test -- src/lib/__tests__/ftp-provider.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add package.json package-lock.json src/lib/storage/ftpProvider.ts src/lib/__tests__/ftp-provider.test.ts

git commit -m "feat: add ftp storage provider"
```

---

### Task 4: Обновить SystemApp UI (аккордеон)

**Files:**
- Modify: `src/components/desktop/apps/SystemApp.tsx`
- Modify: `src/app/globals.css` (стили аккордеона)

**Step 1: Write the failing test**

Добавить тест для отображения двух секций и статуса (минимальный snapshot/DOM‑тест).

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/desktop/apps/__tests__/system-app.test.tsx`
Expected: FAIL.

**Step 3: Implement accordion**
- Секции SMB/FTP с заголовком и точкой статуса.
- При успешном сохранении секция сворачивается.
- Активный провайдер подсвечивается.

**Step 4: Run tests**

Run: `npm test -- src/components/desktop/apps/__tests__/system-app.test.tsx`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/components/desktop/apps/SystemApp.tsx src/app/globals.css src/components/desktop/apps/__tests__/system-app.test.tsx

git commit -m "feat: add smb/ftp accordion settings"
```
