# Cutefish File Manager UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current XP-style file manager UI with a Cutefish-inspired layout while keeping all existing file logic, and add a real `foto` root folder alongside `video` so SMB video mounts under `video` continue to work.

**Architecture:** Keep backend APIs and client logic in `FileManagerApp`, but refactor UI into dedicated subcomponents (header/toolbar, path bar, sidebar, content view, status bar). Add path navigation history (back/forward/up), breadcrumb navigation, and view toggles. Update filemanager root folder setup to create both `video` and `foto` and mark them as reserved.

**Tech Stack:** Next.js App Router (Client Components), React, TypeScript, Vitest, CSS.

---

### Task 1: Add `foto` root support in filemanager service (TDD)

**Files:**
- Modify: `src/lib/__tests__/filemanager-paths.test.ts`
- Modify: `src/lib/__tests__/filemanager-service.test.ts`
- Modify: `src/lib/filemanager/paths.ts`
- Modify: `src/lib/filemanager/service.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { isReservedRootFolder } from "@/lib/filemanager/paths";

it("detects reserved root folders", () => {
  expect(isReservedRootFolder("video")).toBe(true);
  expect(isReservedRootFolder("foto")).toBe(true);
  expect(isReservedRootFolder("docs")).toBe(false);
});
```

```ts
it("creates video + foto root and lists entries", async () => {
  const base = await mkdtemp(join(tmpdir(), "fm-"));
  await ensureUserVideoRoot(base, "user-1");
  const result = await listEntries(base, "user-1", "");
  expect(result.folders.some((f) => f.name === "video")).toBe(true);
  expect(result.folders.some((f) => f.name === "foto")).toBe(true);
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/filemanager-paths.test.ts src/lib/__tests__/filemanager-service.test.ts`
Expected: FAIL with missing `foto` root expectations.

**Step 3: Write minimal implementation**

```ts
const RESERVED_ROOT = new Set(["video", "foto"]);

export async function ensureUserVideoRoot(dataDir: string, userId: string) {
  const root = buildUserRoot(dataDir, userId);
  await Promise.all([
    mkdir(join(root, "video"), { recursive: true }),
    mkdir(join(root, "foto"), { recursive: true }),
  ]);
  return root;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/filemanager-paths.test.ts src/lib/__tests__/filemanager-service.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/__tests__/filemanager-paths.test.ts src/lib/__tests__/filemanager-service.test.ts src/lib/filemanager/paths.ts src/lib/filemanager/service.ts
git commit -m "feat: add foto root folder"
```

---

### Task 2: Introduce Cutefish layout components + sidebar (TDD)

**Files:**
- Create: `src/components/desktop/apps/filemanager/Sidebar.tsx`
- Modify: `src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx`

**Step 1: Update tests to target new sidebar**

```tsx
import { renderToString } from "react-dom/server";
import { Sidebar } from "../Sidebar";

it("renders sidebar sections", () => {
  const html = renderToString(
    <Sidebar
      activeKey="desktop"
      onNavigate={() => undefined}
      onOpenFavorites={() => undefined}
    />
  );
  expect(html).toContain("Desktop");
  expect(html).toContain("Documents");
  expect(html).toContain("Drives");
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx`
Expected: FAIL with missing `Sidebar` export.

**Step 3: Implement `Sidebar` component**

```tsx
export function Sidebar({ activeKey, onNavigate, onOpenFavorites }: Props) {
  const items = [
    { key: "home", label: "Home" },
    { key: "desktop", label: "Desktop" },
    { key: "documents", label: "Documents" },
    { key: "downloads", label: "Downloads" },
    { key: "music", label: "Music" },
    { key: "pictures", label: "Pictures" },
    { key: "videos", label: "Videos" },
    { key: "trash", label: "Trash" },
  ];
  return (
    <aside className="cfm-sidebar">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`cfm-side-item ${activeKey === item.key ? "active" : ""}`}
          onClick={() => onNavigate("")}
        >
          <span className={`cfm-side-icon ${item.key}`} />
          <span>{item.label}</span>
        </button>
      ))}
      <div className="cfm-side-section">Drives</div>
      <button type="button" className="cfm-side-drive" onClick={() => onNavigate("")}>31.5 GiB Hard Drive</button>
      <button type="button" className="cfm-side-drive" onClick={() => onNavigate("")}>Debian Cutefish</button>
      <button type="button" className="cfm-side-drive" onClick={() => onNavigate("")}>Basic data partition</button>
      <button type="button" className="cfm-side-drive" onClick={() => onNavigate("")}>104.2 GiB Hard Drive</button>
      <button type="button" className="cfm-side-favorites" onClick={onOpenFavorites}>Favorites</button>
    </aside>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/apps/filemanager/Sidebar.tsx src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx
git commit -m "feat: add cutefish sidebar"
```

---

### Task 3: Add header/toolbar, path bar, status bar, and navigation logic (TDD)

**Files:**
- Create: `src/components/desktop/apps/filemanager/HeaderBar.tsx`
- Create: `src/components/desktop/apps/filemanager/PathBar.tsx`
- Create: `src/components/desktop/apps/filemanager/StatusBar.tsx`
- Modify: `src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`
- Modify: `src/modules/core/filemanager/module.tsx`
- Modify: `src/components/desktop/apps/FileManagerApp.tsx`

**Step 1: Update layout test expectations**

```tsx
const html = renderToString(
  <FileManagerApp
    onOpenVideo={() => undefined}
    onOpenUploads={() => undefined}
    userEmail="user@example.com"
  />
);
expect(html).toContain("Home");
expect(html).toContain("Desktop");
expect(html).toContain("Items:");
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`
Expected: FAIL with missing labels.

**Step 3: Implement components + wire navigation logic**

```tsx
const [view, setView] = useState<FileManagerView>("root");
const [currentPath, setCurrentPath] = useState("");
const [history, setHistory] = useState<string[]>([""]);
const [historyIndex, setHistoryIndex] = useState(0);

const navigateTo = (path: string, push = true) => {
  setView(path ? "video" : "root");
  setCurrentPath(path);
  if (push) {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), path]);
    setHistoryIndex((prev) => prev + 1);
  }
};
```

```tsx
const userLabel = userEmail?.split("@")[0] ?? "Guest";
const crumbs = ["Home", userLabel, ...currentPath.split("/").filter(Boolean)];
```

Use `HeaderBar` for toolbar buttons (Back/Forward/Up/New Folder/Upload/Delete), `PathBar` for breadcrumbs (clickable), and `StatusBar` for item counts + selection.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/apps/filemanager/HeaderBar.tsx src/components/desktop/apps/filemanager/PathBar.tsx src/components/desktop/apps/filemanager/StatusBar.tsx src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx src/modules/core/filemanager/module.tsx src/components/desktop/apps/FileManagerApp.tsx
git commit -m "feat: add cutefish header and navigation"
```

---

### Task 4: Replace icon grid with Cutefish content view + view toggles (TDD)

**Files:**
- Create: `src/components/desktop/apps/filemanager/ContentView.tsx`
- Modify: `src/components/desktop/apps/FileManagerApp.tsx`

**Step 1: Add a content view test**

```tsx
import { renderToString } from "react-dom/server";
import { ContentView } from "../ContentView";

it("renders entries in grid mode", () => {
  const html = renderToString(
    <ContentView
      entries={[{ type: "folder", name: "video", path: "video" }]}
      favorites={new Set()}
      selectedPath={null}
      layout="grid"
      onSelect={() => undefined}
      onOpen={() => undefined}
      onToggleFavorite={() => undefined}
    />
  );
  expect(html).toContain("video");
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/desktop/apps/filemanager/__tests__/content-view.test.tsx`
Expected: FAIL (new test file not present yet).

**Step 3: Implement `ContentView` and wire layout toggle**

```tsx
export function ContentView({ layout, entries, ...props }: Props) {
  return (
    <div className={`cfm-content cfm-${layout}`}>{/* tiles */}</div>
  );
}
```

Add layout state in `FileManagerApp` (`grid` | `list`) and connect toolbar view toggle buttons to set it.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/desktop/apps/filemanager/__tests__/content-view.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/apps/filemanager/ContentView.tsx src/components/desktop/apps/filemanager/__tests__/content-view.test.tsx src/components/desktop/apps/FileManagerApp.tsx
git commit -m "feat: add cutefish content view"
```

---

### Task 5: Update Cutefish styles (visual parity)

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add CSS section for Cutefish file manager**

```css
.cfm-window {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  height: 100%;
  background: #f7f8fb;
  border-radius: 12px;
  overflow: hidden;
}

.cfm-sidebar {
  background: #f2f4f8;
  border-right: 1px solid #e3e6ee;
}

.cfm-content {
  background: #ffffff;
}
```

**Step 2: Manually verify layout in the app**

Run: `npm run dev` and open the file manager window.
Expected: Sidebar + toolbar + breadcrumb + content area match Cutefish layout.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: style cutefish file manager"
```

---

### Task 6: Update manifests + cleanup + full test run

**Files:**
- Modify: `src/modules/core/filemanager/module.tsx`
- Modify (if unused): `src/components/desktop/apps/filemanager/TaskPane.tsx`
- Modify (if unused): `src/components/desktop/apps/filemanager/IconGrid.tsx`

**Step 1: Remove unused XP components (if no longer referenced)**

Delete or repurpose old XP components only if there are no imports left.

**Step 2: Run full test suite**

Run: `npm test`
Expected: All existing tests pass except the known pre-existing `window-chrome` failure.

**Step 3: Commit cleanup**

```bash
git add src/modules/core/filemanager/module.tsx src/components/desktop/apps/filemanager/TaskPane.tsx src/components/desktop/apps/filemanager/IconGrid.tsx
git commit -m "chore: clean up filemanager legacy components"
```
