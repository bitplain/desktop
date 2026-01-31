# SMB root path fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** исправить маппинг корня SMB, чтобы список файлов в папке `video` не зависал и возвращал содержимое шары.

**Architecture:** поменять `buildRemotePath` так, чтобы корень SMB маппился в пустую строку (а не `"\\"`), и обновить тесты для этого поведения.

**Tech Stack:** Next.js API routes, TypeScript, vitest.

---

### Task 1: Обновить тест на маппинг корня SMB

**Files:**
- Modify: `src/lib/__tests__/storage-paths.test.ts`

**Step 1: Write the failing test**

Обновить ожидаемое значение:
```ts
it("maps video root to smb share root", () => {
  expect(buildRemotePath("video", "")).toBe("");
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/storage-paths.test.ts`
Expected: FAIL (ожидалось "", получено "\\").

---

### Task 2: Минимальная правка buildRemotePath

**Files:**
- Modify: `src/lib/storage/paths.ts`

**Step 1: Write minimal implementation**

Изменить возврат, чтобы пустой результат оставался пустой строкой:
```ts
export function buildRemotePath(path: string, subPath: string) {
  const tail = stripVideoPrefix(path);
  const joined = [subPath, tail].filter(Boolean).join("/");
  return joined;
}
```

**Step 2: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/storage-paths.test.ts`
Expected: PASS.

---

### Task 3: Коммит

```bash
git add src/lib/__tests__/storage-paths.test.ts src/lib/storage/paths.ts
git commit -m "fix: map smb root to empty path"
```
