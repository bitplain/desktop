# Uploads Window + Video Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a separate XP-style uploads window that auto-opens on upload and auto-closes immediately when complete, plus spacebar play/pause and autoplay on video navigation.

**Architecture:** Add an `uploadStore` to track upload items and a new `uploads` module to render the list. Extend module props with `closeWindow` so the uploads module can self-close. File Manager writes to the store and opens the uploads window. Video Player uses a helper to handle key events, including spacebar, and auto-plays when selection changes.

**Tech Stack:** Next.js (App Router), React, TypeScript, Vitest.

---

### Task 1: Add upload store (TDD)

**Files:**
- Create: `src/lib/uploadStore.ts`
- Create: `src/lib/__tests__/upload-store.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import {
  addUpload,
  clearUploads,
  getUploads,
  hasActiveUploads,
  updateUpload,
} from "@/lib/uploadStore";

describe("upload store", () => {
  it("adds and updates uploads", () => {
    clearUploads();
    addUpload({ id: "1", name: "a.mp4", progress: 0, status: "queued" });
    updateUpload("1", { progress: 100, status: "done" });
    const list = getUploads();
    expect(list[0]?.name).toBe("a.mp4");
    expect(list[0]?.status).toBe("done");
  });

  it("tracks active uploads", () => {
    clearUploads();
    addUpload({ id: "1", name: "a.mp4", progress: 0, status: "queued" });
    expect(hasActiveUploads()).toBe(true);
    updateUpload("1", { status: "done" });
    expect(hasActiveUploads()).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/__tests__/upload-store.test.ts`
Expected: FAIL (missing module or functions).

**Step 3: Write minimal implementation**

```typescript
type UploadStatus = "queued" | "uploading" | "done" | "error";
type UploadItem = { id: string; name: string; progress: number; status: UploadStatus; error?: string };
```

Add `getUploads`, `addUpload`, `updateUpload`, `clearUploads`, `hasActiveUploads`, `useUploads` with `useSyncExternalStore`.

**Step 4: Run test to verify it passes**

Run: `npm test src/lib/__tests__/upload-store.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/uploadStore.ts src/lib/__tests__/upload-store.test.ts
git commit -m "feat: add upload store"
```

---

### Task 2: Add uploads window layout + module (TDD)

**Files:**
- Create: `src/components/desktop/apps/UploadManagerApp.tsx`
- Create: `src/components/desktop/apps/__tests__/upload-manager-layout.test.tsx`
- Create: `src/modules/core/uploads/module.tsx`
- Modify: `src/modules/types.ts`
- Modify: `src/components/desktop/DesktopShell.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { UploadManagerLayout } from "../UploadManagerApp";

describe("upload manager layout", () => {
  it("renders upload items", () => {
    const html = renderToString(
      <UploadManagerLayout
        uploads={[{ id: "1", name: "a.mp4", progress: 50, status: "uploading" }]}
      />
    );
    expect(html).toContain("Загрузки");
    expect(html).toContain("a.mp4");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/desktop/apps/__tests__/upload-manager-layout.test.tsx`
Expected: FAIL (module not found).

**Step 3: Implement UploadManagerApp**

- Export `UploadManagerLayout` to render header + list.
- Default component uses `useUploads()` and closes window when `hasActiveUploads()` is false.
- Call `clearUploads()` when closing.

**Step 4: Add uploads module + closeWindow prop support**

- Add `closeWindow?: (id: string) => void` to `ModuleManifest`.
- Pass `closeWindow` from `DesktopShell` into module Window.
- Create `uploads` module manifest (no desktop/start icons) that renders `UploadManagerApp` and calls `closeWindow` with id.

**Step 5: Run test to verify it passes**

Run: `npm test src/components/desktop/apps/__tests__/upload-manager-layout.test.tsx`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/components/desktop/apps/UploadManagerApp.tsx src/components/desktop/apps/__tests__/upload-manager-layout.test.tsx src/modules/core/uploads/module.tsx src/modules/types.ts src/components/desktop/DesktopShell.tsx
git commit -m "feat: add uploads window"
```

---

### Task 3: Wire File Manager uploads to store

**Files:**
- Modify: `src/components/desktop/apps/FileManagerApp.tsx`
- Modify: `src/modules/core/filemanager/module.tsx`

**Step 1: Write the failing test**

No new unit test required (UI wiring). Rely on store tests + manual check.

**Step 2: Implement wiring**

- Remove local `uploads` state and inline upload panel.
- Use `addUpload`/`updateUpload` from `uploadStore`.
- Open uploads window at upload start via `onOpenUploads` prop.
- Pass `onOpenUploads` from module using `openWindow("uploads")`.

**Step 3: Commit**

```bash
git add src/components/desktop/apps/FileManagerApp.tsx src/modules/core/filemanager/module.tsx
git commit -m "refactor: move uploads to window"
```

---

### Task 4: Add upload window styles

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add styles**

- Add `.upload-manager` container styles.
- Add `.upload-manager-list`, `.upload-manager-item`, `.upload-manager-progress`.
- Reuse XP green progress bar styling.

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style: uploads window"
```

---

### Task 5: Spacebar play/pause + autoplay on selection (TDD)

**Files:**
- Modify: `src/components/desktop/apps/videoKeyNavigation.ts`
- Modify: `src/components/desktop/apps/__tests__/video-key-navigation.test.ts`
- Modify: `src/components/desktop/apps/VideoPlayerApp.tsx`

**Step 1: Write the failing test**

```typescript
it("toggles playback on space", () => {
  const target = new FakeTarget();
  let toggles = 0;
  const cleanup = attachVideoKeyNavigation(target, {
    onNext: () => undefined,
    onPrevious: () => undefined,
    onToggle: () => {
      toggles += 1;
    },
  });
  target.dispatch({ key: " " });
  expect(toggles).toBe(1);
  cleanup();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/desktop/apps/__tests__/video-key-navigation.test.ts`
Expected: FAIL (no space handler).

**Step 3: Implement changes**

- Extend `attachVideoKeyNavigation` to call `onToggle` when `key === " "` or `key === "Space"`.
- In `VideoPlayerApp`, add `videoRef`, toggle play/pause on `onToggle`, prevent default.
- Add effect to auto-play when `selection` changes (ignore play errors).

**Step 4: Run test to verify it passes**

Run: `npm test src/components/desktop/apps/__tests__/video-key-navigation.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/apps/videoKeyNavigation.ts src/components/desktop/apps/__tests__/video-key-navigation.test.ts src/components/desktop/apps/VideoPlayerApp.tsx
git commit -m "feat: video space toggle"
```

---

### Task 6: Full verification

**Step 1: Run tests**

Run: `npm test`
Expected: PASS.

**Step 2: Commit any remaining updates**

```bash
git add -A
git commit -m "chore: finalize uploads window"
```
