# XP Explorer Full Chrome Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render the File Manager using the full XP Explorer chrome from `screen/index.html` and `screen/style.css`, while hiding the outer desktop window chrome and keeping all existing file manager behavior.

**Architecture:** Add optional window chrome settings to `ModuleManifest` (hide outer chrome + drag handle selector). Update `Window` to support chromeless mode and drag initiation from a selector. Rebuild File Manager layout to mirror the XP mock and scope the sample CSS under `.xp-explorer` to avoid global collisions.

**Tech Stack:** Next.js (App Router), React, TypeScript, Vitest.

---

### Task 1: Add chromeless window options (TDD)

**Files:**
- Modify: `src/modules/types.ts`
- Modify: `src/components/desktop/DesktopShell.tsx`
- Modify: `src/components/desktop/Window.tsx`
- Create: `src/components/desktop/__tests__/window-chrome.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import Window from "../Window";

const baseProps = {
  id: "filemanager",
  title: "File Manager",
  isMinimized: false,
  isMaximized: false,
  zIndex: 10,
  position: { x: 0, y: 0 },
  size: { width: 600, height: 400 },
  onClose: () => undefined,
  onMinimize: () => undefined,
  onMaximize: () => undefined,
  onRestoreFromMaximize: () => undefined,
  onFocus: () => undefined,
  onPositionChange: () => undefined,
  onSizeChange: () => undefined,
  children: <div>Inner</div>,
};

describe("window chrome", () => {
  it("omits chrome when hideChrome is true", () => {
    const html = renderToString(<Window {...baseProps} hideChrome />);
    expect(html).toContain("window--chromeless");
    expect(html).not.toContain("window-header");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/desktop/__tests__/window-chrome.test.tsx`
Expected: FAIL (prop missing / class absent).

**Step 3: Implement minimal changes**

- Add optional `window` config to `ModuleManifest` (e.g., `window?: { hideChrome?: boolean; dragHandleSelector?: string; }`).
- Pass `hideChrome` and `dragHandleSelector` from DesktopShell → Window.
- Update Window to:
  - add `window--chromeless` class when `hideChrome` is true,
  - skip rendering `.window-header` when `hideChrome` is true,
  - move drag handling to the root and require `dragHandleSelector` (or `.window-header` when not chromeless).

**Step 4: Run test to verify it passes**

Run: `npm test src/components/desktop/__tests__/window-chrome.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/modules/types.ts src/components/desktop/DesktopShell.tsx src/components/desktop/Window.tsx src/components/desktop/__tests__/window-chrome.test.tsx
git commit -m "feat: support chromeless windows"
```

---

### Task 2: Add XP Explorer styles (copy from screen)

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add the scoped CSS**

- Copy `screen/style.css` into `globals.css` under `.xp-explorer` scope.
- Replace `.window` selectors with `.xp-explorer`.
- Add icon classes for `.xp-explorer .icon.folder`, `.icon.video`, `.icon.favorite`.
- Add `.xp-explorer .item.selected` styling.

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style: xp explorer chrome"
```

---

### Task 3: Rebuild File Manager markup to match the mock (TDD)

**Files:**
- Modify: `src/components/desktop/apps/FileManagerApp.tsx`
- Modify: `src/modules/core/filemanager/module.tsx`
- Create: `src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import FileManagerApp from "../../FileManagerApp";

describe("xp explorer layout", () => {
  it("renders chrome sections", () => {
    const html = renderToString(
      <FileManagerApp onOpenVideo={() => undefined} onOpenUploads={() => undefined} />
    );
    expect(html).toContain("Файл");
    expect(html).toContain("Адрес:");
    expect(html).toContain("Объектов");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`
Expected: FAIL (mock chrome not present).

**Step 3: Implement markup changes**

- Replace existing file manager layout with the `screen/index.html` structure.
- Map actions to the task pane links (create folder, upload, delete).
- Use `windowControls` for XP titlebar buttons.
- Add `window` options in module manifest: `hideChrome: true`, `dragHandleSelector: ".xp-explorer .titlebar"`.
- Keep grid behavior (select/open, favorites overlay).
- Update address bar and status bar values.

**Step 4: Run test to verify it passes**

Run: `npm test src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/apps/FileManagerApp.tsx src/modules/core/filemanager/module.tsx src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx
git commit -m "refactor: xp explorer file manager"
```

---

### Task 4: Full verification

**Step 1: Run tests**

Run: `npm test`
Expected: PASS.

**Step 2: Commit any remaining updates**

```bash
git add -A
git commit -m "chore: finalize xp explorer chrome"
```
