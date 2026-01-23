# XP File Manager UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the file manager UI with an XP chrome layout (task pane + icon grid), add a reusable wrapper, and update video playback sizing and keyboard navigation using a snapshot list.

**Architecture:** Introduce a shared `XpChrome` wrapper that renders a left task pane slot and a right content slot. Refactor File Manager into `TaskPane` and `IconGrid` subcomponents that plug into the wrapper. Update the video selection store to keep a list + index so the Video Player can move with ArrowLeft/ArrowRight. Update CSS to match the XP look and to make the video fill the window using `object-fit: cover`.

**Tech Stack:** Next.js (App Router), React, TypeScript, Vitest.

---

### Task 1: Update video selection store (TDD)

**Files:**
- Modify: `src/lib/__tests__/video-selection-store.test.ts`
- Modify: `src/lib/videoSelectionStore.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import {
  getCurrentVideo,
  moveVideoSelection,
  setVideoSelection,
} from "@/lib/videoSelectionStore";

it("moves selection without wrapping", () => {
  setVideoSelection(
    [
      { path: "video/a.mp4", name: "a.mp4" },
      { path: "video/b.mp4", name: "b.mp4" },
    ],
    "video/a.mp4"
  );
  moveVideoSelection(1);
  expect(getCurrentVideo()?.path).toBe("video/b.mp4");
  moveVideoSelection(1);
  expect(getCurrentVideo()?.path).toBe("video/b.mp4");
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/__tests__/video-selection-store.test.ts`
Expected: FAIL because `setVideoSelection` or `moveVideoSelection` does not exist.

**Step 3: Write minimal implementation**

```typescript
type VideoItem = { path: string; name: string };

let list: VideoItem[] = [];
let index = -1;

export function setVideoSelection(nextList: VideoItem[], currentPath: string) {
  list = nextList;
  index = nextList.findIndex((item) => item.path === currentPath);
  if (index < 0 && nextList.length > 0) index = 0;
  listeners.forEach((listener) => listener());
}

export function moveVideoSelection(delta: number) {
  if (list.length === 0 || index < 0) return;
  const next = Math.min(list.length - 1, Math.max(0, index + delta));
  if (next === index) return;
  index = next;
  listeners.forEach((listener) => listener());
}

export function getCurrentVideo() {
  if (index < 0 || index >= list.length) return null;
  return list[index];
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/lib/__tests__/video-selection-store.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/__tests__/video-selection-store.test.ts src/lib/videoSelectionStore.ts
git commit -m "feat: store video selection list"
```

---

### Task 2: Add shared XP chrome wrapper (TDD)

**Files:**
- Create: `src/components/desktop/apps/shared/XpChrome.tsx`
- Create: `src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { XpChrome } from "../XpChrome";

it("renders left and right panes", () => {
  const html = renderToString(
    <XpChrome left={<div>Left Pane</div>}>
      <div>Right Pane</div>
    </XpChrome>
  );
  expect(html).toContain("Left Pane");
  expect(html).toContain("Right Pane");
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx`
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

```tsx
import { ReactNode } from "react";

export function XpChrome({ left, children }: { left: ReactNode; children: ReactNode }) {
  return (
    <div className="xp-chrome">
      <aside className="xp-chrome-taskpane">{left}</aside>
      <section className="xp-chrome-content">{children}</section>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/apps/shared/XpChrome.tsx src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx
git commit -m "feat: add xp chrome wrapper"
```

---

### Task 3: Refactor File Manager into TaskPane + IconGrid (TDD)

**Files:**
- Create: `src/components/desktop/apps/filemanager/TaskPane.tsx`
- Create: `src/components/desktop/apps/filemanager/IconGrid.tsx`
- Create: `src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx`
- Modify: `src/components/desktop/apps/FileManagerApp.tsx`

**Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { TaskPane } from "../TaskPane";
import { IconGrid } from "../IconGrid";

it("renders task pane shortcuts", () => {
  const html = renderToString(
    <TaskPane
      view="video"
      loading={false}
      error={null}
      onViewChange={() => undefined}
      onCreateFolder={() => undefined}
      onUpload={() => undefined}
      onDelete={() => undefined}
      selectedLabel={null}
    />
  );
  expect(html).toContain("Избранное");
  expect(html).toContain("Создать папку");
});

it("renders favorites tile", () => {
  const html = renderToString(
    <IconGrid
      view="video"
      entries={[]}
      favorites={new Set()}
      selectedPath={null}
      onSelect={() => undefined}
      onOpen={() => undefined}
      onToggleFavorite={() => undefined}
      onOpenFavorites={() => undefined}
      onOpenVideo={() => undefined}
    />
  );
  expect(html).toContain("Избранное");
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx`
Expected: FAIL (modules not found).

**Step 3: Implement TaskPane and IconGrid**

- TaskPane: render XP sections and buttons/links for Video, Favorites, and Root; call handlers on click; show simple details (selected label + status).
- IconGrid: render favorites tile + entries; support selection, double-click to open, and star toggle for files.

**Step 4: Refactor FileManagerApp**

- Use `XpChrome` wrapper with `TaskPane` on the left and `IconGrid` on the right.
- Replace `setCurrentVideo` with `setVideoSelection(list, path)`.
- Build a playlist list from the current view (video folder or favorites) and pass it to the store on open.
- Keep `/video` restriction; show error in details section when outside.
- Keep upload logic; route upload button from TaskPane to file input.

**Step 5: Run tests to verify they pass**

Run: `npm test src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/components/desktop/apps/filemanager src/components/desktop/apps/FileManagerApp.tsx
git commit -m "refactor: split file manager panes"
```

---

### Task 4: Update XP styles and video sizing

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Update XP chrome and file manager styles**

- Add `.xp-chrome`, `.xp-chrome-taskpane`, `.xp-chrome-content`.
- Add XP task pane section styles with blue gradients and inset borders.
- Add icon grid styles for large tiles, selection, and favorites icon.
- Remove old `.filemanager-row` list styles.

**Step 2: Update video sizing styles**

- Update `.video-player` to fill the window.
- Update `.video-player video` to `width: 100%`, `height: 100%`, `object-fit: cover`.

**Step 3: Run targeted tests**

Run: `npm test src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx`
Expected: PASS (smoke test only).

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: xp file manager layout"
```

---

### Task 5: Video player keyboard navigation

**Files:**
- Modify: `src/components/desktop/apps/VideoPlayerApp.tsx`

**Step 1: Update player to handle ArrowLeft/ArrowRight**

- Add `useEffect` to listen for `keydown`.
- Call `moveVideoSelection(-1)` on ArrowLeft and `moveVideoSelection(1)` on ArrowRight.
- Use `useCurrentVideo()` to update playback.

**Step 2: Run selection store tests**

Run: `npm test src/lib/__tests__/video-selection-store.test.ts`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/components/desktop/apps/VideoPlayerApp.tsx
git commit -m "feat: add keyboard navigation for video"
```
