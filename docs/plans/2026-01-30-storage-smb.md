# SMB Storage + Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Добавить per-user подключение SMB-шары и использовать её в файловом менеджере/плеере, плюс доработать UI (настройки, фиксированный размер плеера, убрать обводку иконок).

**Architecture:** Вводим абстракцию StorageProvider с локальной и SMB реализацией. Настройки SMB храним в БД (пароль шифруем), API файлового менеджера выбирает провайдера по наличию активного подключения пользователя.

**Tech Stack:** Next.js App Router, Prisma/Postgres, Node.js, React, Zustand.

---

### Task 1: Добавить модель подключения к хранилищу

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_storage_connection/migration.sql`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { normalizeStorageSubPath } from "@/lib/storage/paths";

describe("storage subpath normalize", () => {
  it("keeps safe normalized path", () => {
    expect(normalizeStorageSubPath("media/videos")).toBe("media/videos");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/storage-paths.test.ts`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

```ts
export function normalizeStorageSubPath(input: string) {
  const cleaned = input.replace(/\\/g, "/").trim();
  const stripped = cleaned.replace(/^\/+/, "");
  const normalized = stripped.replace(/\/+$/, "");
  return normalized === "." ? "" : normalized;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/storage-paths.test.ts`
Expected: PASS.

**Step 5: Update Prisma schema**

```prisma
model StorageConnection {
  id               String   @id @default(cuid())
  userId           String   @unique
  provider         StorageProvider
  host             String
  share            String
  subPath          String
  username         String
  passwordEncrypted String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}

enum StorageProvider {
  SMB
}
```

**Step 6: Create migration**

Run: `npx prisma migrate dev --name add_storage_connection --create-only`
Expected: Migration folder created with `CREATE TABLE "StorageConnection"` and enum.

**Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations

git commit -m "feat: add storage connection model"
```

---

### Task 2: Шифрование пароля SMB

**Files:**
- Create: `src/lib/storage/crypto.ts`
- Create: `src/lib/__tests__/storage-crypto.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/storage/crypto";

it("round trips secret", () => {
  const cipher = encryptSecret("pass", "secret1234567890abcd");
  expect(decryptSecret(cipher, "secret1234567890abcd")).toBe("pass");
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/storage-crypto.test.ts`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

```ts
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

function deriveKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string, secret: string) {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string, secret: string) {
  const [ivRaw, tagRaw, dataRaw] = payload.split(":");
  if (!ivRaw || !tagRaw || !dataRaw) {
    throw new Error("Invalid secret payload");
  }
  const key = deriveKey(secret);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataRaw, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/storage-crypto.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/storage/crypto.ts src/lib/__tests__/storage-crypto.test.ts

git commit -m "feat: add storage secret crypto"
```

---

### Task 3: Абстракция StorageProvider + локальный провайдер

**Files:**
- Create: `src/lib/storage/types.ts`
- Create: `src/lib/storage/localProvider.ts`
- Create: `src/lib/storage/paths.ts`
- Modify: `src/lib/filemanager/service.ts`
- Modify: `src/lib/filemanager/api.ts`
- Create: `src/lib/__tests__/storage-provider.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildRemotePath } from "@/lib/storage/paths";

it("maps video prefix to subpath", () => {
  expect(buildRemotePath("video/cats/clip.mp4", "media/videos")).toBe("media/videos/cats/clip.mp4");
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/storage-provider.test.ts`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

```ts
export function stripVideoPrefix(path: string) {
  if (path === "video") return "";
  return path.startsWith("video/") ? path.slice("video/".length) : path;
}

export function buildRemotePath(path: string, subPath: string) {
  const tail = stripVideoPrefix(path);
  return [subPath, tail].filter(Boolean).join("/");
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/storage-provider.test.ts`
Expected: PASS.

**Step 5: Create provider types and local provider**

```ts
export type StorageEntry = {
  name: string;
  path: string;
  size?: number | null;
  updatedAt: string;
  type: "file" | "folder";
};

export type StorageProvider = {
  list: (path: string) => Promise<{ folders: StorageEntry[]; files: StorageEntry[] }>;
  stat: (path: string) => Promise<{ size: number }>;
  createReadStream: (path: string, options?: { start?: number; end?: number }) => NodeJS.ReadableStream;
  writeFile: (path: string, data: Buffer) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  deleteFolder: (path: string) => Promise<void>;
};
```

Перенести текущую логику `listEntries`, `createFolder`, `deleteFile`, `deleteFolder` в `localProvider`.

**Step 6: Run tests**

Run: `npm test -- src/lib/__tests__/storage-provider.test.ts src/lib/__tests__/filemanager-api.test.ts`
Expected: PASS (existing tests updated if needed).

**Step 7: Commit**

```bash
git add src/lib/storage src/lib/filemanager src/lib/__tests__/storage-provider.test.ts

git commit -m "feat: add storage provider abstraction"
```

---

### Task 4: SMB провайдер (зависимость)

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/storage/smbProvider.ts`
- Create: `src/lib/storage/connection.ts`

**Step 0: Approval**

Нужно явное разрешение на добавление зависимости для SMB (предлагаю `smb2`).

**Step 1: Add dependency**

Run: `npm install smb2`
Expected: dependency added in `package.json` and `package-lock.json`.

**Step 2: Implement SMB provider**

```ts
import SMB2 from "smb2";
import type { StorageProvider } from "./types";

export function createSmbProvider(opts: {
  host: string;
  share: string;
  username: string;
  password: string;
}) : StorageProvider {
  const client = new SMB2({
    share: `\\\\${opts.host}\\${opts.share}`,
    username: opts.username,
    password: opts.password,
    autoCloseTimeout: 10000,
  });

  return {
    list: async (path) => {
      const items = await client.readdir(path);
      // затем stat каждого элемента, собрать folders/files
    },
    stat: async (path) => client.stat(path),
    createReadStream: (path, options) => client.createReadStream(path, options),
    writeFile: async (path, data) => client.writeFile(path, data),
    createFolder: async (path) => client.mkdir(path, { recursive: true }),
    deleteFile: async (path) => client.unlink(path),
    deleteFolder: async (path) => client.rmdir(path, { recursive: true }),
  };
}
```

**Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/storage/smbProvider.ts src/lib/storage/connection.ts

git commit -m "feat: add smb storage provider"
```

---

### Task 5: API для настройки подключения и интеграция в filemanager

**Files:**
- Create: `src/app/api/storage/connection/route.ts`
- Modify: `src/app/api/filemanager/list/route.ts`
- Modify: `src/app/api/filemanager/stream/route.ts`
- Modify: `src/app/api/filemanager/upload/route.ts`
- Modify: `src/app/api/filemanager/files/route.ts`
- Modify: `src/app/api/filemanager/folders/route.ts`

**Step 1: Write failing API test (minimal)**

```ts
import { describe, expect, it } from "vitest";
import { buildRemotePath } from "@/lib/storage/paths";

it("keeps video root mapping", () => {
  expect(buildRemotePath("video", "media/videos")).toBe("media/videos");
});
```

**Step 2: Run test**

Run: `npm test -- src/lib/__tests__/storage-provider.test.ts`
Expected: PASS.

**Step 3: Implement API routes**

- `GET /api/storage/connection` → возвращает конфиг без пароля + `connected`.
- `POST /api/storage/connection` → upsert, шифрует пароль.
- `DELETE /api/storage/connection` → удаляет запись.

**Step 4: Update filemanager routes**

Заменить прямую работу с FS на провайдера: `list`, `stream`, `upload`, `delete`.

**Step 5: Commit**

```bash
git add src/app/api src/lib/storage

git commit -m "feat: add storage connection api"
```

---

### Task 6: UI настроек (SMB) + индикатор

**Files:**
- Modify: `src/components/desktop/apps/SystemApp.tsx`
- Modify: `src/modules/core/system/module.tsx`
- Modify: `src/app/globals.css`

**Step 1: Write failing UI test (snapshot-like)**

```tsx
import { renderToString } from "react-dom/server";
import SystemApp from "@/components/desktop/apps/SystemApp";

it("renders storage panel", () => {
  const html = renderToString(<SystemApp title="Настройки" />);
  expect(html).toContain("Файловая шара");
});
```

**Step 2: Run test**

Run: `npm test -- src/components/desktop/apps/__tests__/system-app.test.tsx`
Expected: FAIL (test file missing).

**Step 3: Implement UI**

Панель с полями: IP/Host, Share, SubPath, Login, Password; кнопки Сохранить/Отключить; статус-точка справа в заголовке панели.

**Step 4: Run test**

Run: `npm test -- src/components/desktop/apps/__tests__/system-app.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/apps/SystemApp.tsx src/modules/core/system/module.tsx src/app/globals.css src/components/desktop/apps/__tests__/system-app.test.tsx

git commit -m "feat: add smb settings UI"
```

---

### Task 7: Фиксированный размер окна видео + fit

**Files:**
- Modify: `src/modules/types.ts`
- Modify: `src/components/desktop/DesktopShell.tsx`
- Modify: `src/stores/windowStore.ts`
- Modify: `src/modules/core/video/module.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/stores/__tests__/windowStore.test.ts`

**Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { create } from "zustand";
import { useWindowStore } from "@/stores/windowStore";

it("uses custom default size", () => {
  const store = useWindowStore.getState();
  store.initWindows([{ id: "video", defaultOpen: true, defaultSize: { width: 420, height: 860 } }]);
  expect(store.windowsById.video.size.width).toBe(420);
});
```

**Step 2: Run test**

Run: `npm test -- src/stores/__tests__/windowStore.test.ts`
Expected: FAIL (type/logic missing).

**Step 3: Implement defaultSize support + CSS contain**

- В `ModuleManifest` добавить `window.defaultSize`.
- Протащить в `WindowConfig` и `windowStore.createInitialState`.
- В `video` модуле задать размер ~ iPhone (например 420x860).
- В `.video-player video` изменить `object-fit: contain`.

**Step 4: Run test**

Run: `npm test -- src/stores/__tests__/windowStore.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/modules/types.ts src/components/desktop/DesktopShell.tsx src/stores/windowStore.ts src/modules/core/video/module.tsx src/app/globals.css src/stores/__tests__/windowStore.test.ts

git commit -m "feat: fix video player window size"
```

---

### Task 8: Убрать обводку вокруг иконок рабочего стола

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Update CSS**

```css
.desktop-icon-glyph {
  border: none;
  box-shadow: none;
  background: transparent;
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css

git commit -m "chore: soften desktop icon glyphs"
```

---

### Task 9: Проверки, diff, PR

**Files:**
- Modify: (various)

**Step 1: Run tests**

Run: `npm test`
Expected: все тесты, кроме текущего известного `window-chrome.test.tsx` (если не правим).

**Step 2: Show diff**

```bash
git diff --stat

git diff
```

**Step 3: Push + PR**

```bash
git push -u origin feature/storage-smb
```

Создать PR в основную ветку. Не мержить.
