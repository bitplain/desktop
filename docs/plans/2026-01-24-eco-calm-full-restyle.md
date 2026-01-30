# Eco Calm Full Restyle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply Eco Calm styling to every window, menu, toolbar, and fallback screen while preserving XP wallpaper/cursor.

**Architecture:** Use Eco primitives + Eco role classes. Replace XP palette styles in window chrome, desktop context menu, and file manager chrome with Eco tokens. Add lightweight primitives for menus/toolbars to standardize structure and tests.

**Tech Stack:** Next.js, React 19, TypeScript, CSS (globals.css), Vitest.

---

### Task 1: Add Eco Menu/Toolbar primitives

**Files:**
- Create: `src/components/ui/eco/EcoMenu.tsx`
- Create: `src/components/ui/eco/EcoMenuItem.tsx`
- Create: `src/components/ui/eco/EcoToolbar.tsx`
- Create: `src/components/ui/eco/EcoToolbarButton.tsx`
- Modify: `src/components/ui/eco/index.ts`
- Modify: `src/components/ui/eco/__tests__/eco-primitives.test.tsx`
- Modify: `src/app/globals.css`

**Step 1: Write the failing test**

Add to `src/components/ui/eco/__tests__/eco-primitives.test.tsx`:

```tsx
import { EcoMenu } from "../EcoMenu";
import { EcoMenuItem } from "../EcoMenuItem";
import { EcoToolbar } from "../EcoToolbar";
import { EcoToolbarButton } from "../EcoToolbarButton";

it("renders eco menu and toolbar primitives", () => {
  const menuHtml = renderToString(
    <EcoMenu>
      <EcoMenuItem>Item</EcoMenuItem>
    </EcoMenu>
  );
  expect(menuHtml).toContain('data-eco="menu"');
  expect(menuHtml).toContain('data-eco="menu-item"');

  const toolbarHtml = renderToString(
    <EcoToolbar>
      <EcoToolbarButton>Action</EcoToolbarButton>
    </EcoToolbar>
  );
  expect(toolbarHtml).toContain('data-eco="toolbar"');
  expect(toolbarHtml).toContain('data-eco="toolbar-button"');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ui/eco/__tests__/eco-primitives.test.tsx`
Expected: FAIL with module not found (EcoMenu/EcoToolbar).

**Step 3: Write minimal implementation**

Create `src/components/ui/eco/EcoMenu.tsx`:

```tsx
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoMenuProps = ComponentPropsWithoutRef<"div">;

export function EcoMenu({ className, ...props }: EcoMenuProps) {
  return <div {...props} className={cx("eco-menu", className)} data-eco="menu" />;
}
```

Create `src/components/ui/eco/EcoMenuItem.tsx`:

```tsx
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoMenuItemProps = ComponentPropsWithoutRef<"button">;

export function EcoMenuItem({ className, ...props }: EcoMenuItemProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cx("eco-menu-item", className)}
      data-eco="menu-item"
    />
  );
}
```

Create `src/components/ui/eco/EcoToolbar.tsx`:

```tsx
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoToolbarProps = ComponentPropsWithoutRef<"div">;

export function EcoToolbar({ className, ...props }: EcoToolbarProps) {
  return <div {...props} className={cx("eco-toolbar", className)} data-eco="toolbar" />;
}
```

Create `src/components/ui/eco/EcoToolbarButton.tsx`:

```tsx
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoToolbarButtonProps = ComponentPropsWithoutRef<"button">;

export function EcoToolbarButton({ className, ...props }: EcoToolbarButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cx("eco-toolbar-button", className)}
      data-eco="toolbar-button"
    />
  );
}
```

Update `src/components/ui/eco/index.ts`:

```ts
export * from "./EcoMenu";
export * from "./EcoMenuItem";
export * from "./EcoToolbar";
export * from "./EcoToolbarButton";
```

Add styles to `src/app/globals.css`:

```css
.eco-menu {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 6px;
  box-shadow: var(--shadow);
}

.eco-menu-item {
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
}

.eco-menu-item:hover,
.eco-menu-item:focus-visible {
  background: var(--surface-2);
}

.eco-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.eco-toolbar-button {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ui/eco/__tests__/eco-primitives.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ui/eco src/app/globals.css
git commit -m "feat: add eco menu and toolbar primitives"
```

---

### Task 2: Desktop context menu + icons to Eco style

**Files:**
- Modify: `src/components/desktop/DesktopShell.tsx`
- Modify: `src/components/desktop/DesktopIcons.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/desktop/__tests__/desktop-icons.test.tsx`

**Step 1: Write the failing test**

Create `src/components/desktop/__tests__/desktop-icons.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import DesktopIcons from "../DesktopIcons";

vi.mock("../SettingsProvider", () => ({
  useSettings: () => ({ playSound: vi.fn() }),
}));

describe("desktop icons", () => {
  it("marks eco desktop icons wrapper", () => {
    const html = renderToString(
      <DesktopIcons
        icons={[{ id: "a", label: "App", variant: "app", action: { type: "window", target: "app" } }]}
        onOpenWindow={() => undefined}
      />
    );
    expect(html).toContain('data-eco="desktop-icons"');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/desktop/__tests__/desktop-icons.test.tsx`
Expected: FAIL (missing `data-eco`).

**Step 3: Write minimal implementation**

Update `src/components/desktop/DesktopIcons.tsx` root wrapper:

```tsx
<div className="desktop-icons eco-desktop-icons" data-eco="desktop-icons">
```

Update `src/components/desktop/DesktopShell.tsx` context menu to use Eco primitives:

```tsx
import { EcoMenu, EcoMenuItem } from "@/components/ui/eco";

<EcoMenu className="desktop-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
  <EcoMenuItem onClick={...}>Cascade Windows</EcoMenuItem>
  ...
</EcoMenu>
```

Update `src/app/globals.css` for `.desktop-menu` and `.desktop-icon` to use Eco tokens (replace hard-coded XP colors with `var(--surface)` / `var(--border)` / `var(--text)` and soften radii/shadows).

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/desktop/__tests__/desktop-icons.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/desktop/DesktopShell.tsx src/components/desktop/DesktopIcons.tsx src/components/desktop/__tests__/desktop-icons.test.tsx src/app/globals.css
git commit -m "feat: restyle desktop menu and icons"
```

---

### Task 3: Window chrome + XP window styles to Eco tokens

**Files:**
- Modify: `src/components/desktop/Window.tsx`
- Modify: `src/components/desktop/apps/shared/XpTitlebar.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/desktop/__tests__/window-chrome.test.tsx`

**Step 1: Write the failing test**

Update `src/components/desktop/__tests__/window-chrome.test.tsx`:

```tsx
expect(html).toContain('data-eco="window-control"');
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/desktop/__tests__/window-chrome.test.tsx`
Expected: FAIL (missing `data-eco="window-control"`).

**Step 3: Write minimal implementation**

Update `src/components/desktop/Window.tsx` window controls:

```tsx
<button className="window-control minimize" data-eco="window-control" ... />
```

Update `src/components/desktop/apps/shared/XpTitlebar.tsx` buttons with a shared eco class:

```tsx
<button className="win-btn eco-titlebar-button" ...>_</button>
```

Update `src/app/globals.css` to align chrome with Eco tokens:
- `.window` background/border use `var(--surface)`/`var(--border)`
- `.window-header` gradient uses Eco tones
- `.window-control` background/border use Eco tokens
- `.xp-window`, `.xp-explorer`, `.xp-chrome` remove XP palette, use Eco tokens and fonts

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/desktop/__tests__/window-chrome.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/desktop/Window.tsx src/components/desktop/apps/shared/XpTitlebar.tsx src/app/globals.css src/components/desktop/__tests__/window-chrome.test.tsx
git commit -m "feat: align window chrome with eco tokens"
```

---

### Task 4: File Manager chrome (menubar/toolbar/address/status) to Eco

**Files:**
- Modify: `src/components/desktop/apps/FileManagerApp.tsx`
- Modify: `src/components/desktop/apps/filemanager/TaskPane.tsx`
- Modify: `src/components/desktop/apps/filemanager/IconGrid.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`

**Step 1: Write the failing test**

Update `src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`:

```tsx
expect(html).toContain("eco-menubar");
expect(html).toContain("eco-toolbar");
expect(html).toContain("eco-addressbar");
expect(html).toContain("eco-statusbar");
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`
Expected: FAIL (missing eco classes).

**Step 3: Write minimal implementation**

Update `src/components/desktop/apps/FileManagerApp.tsx`:

```tsx
<div className="menubar eco-menubar" aria-label="Menu bar">...</div>
<div className="toolbar eco-toolbar" aria-label="Toolbar">...</div>
<div className="addressbar eco-addressbar" aria-label="Address bar">...</div>
<div className="statusbar eco-statusbar" aria-label="Status bar">...</div>
```

Update `TaskPane.tsx` and `IconGrid.tsx` to add eco helper classes where needed (e.g., `task-link eco-task-link`, `item eco-file-item`).

Update `src/app/globals.css` to replace XP colors in the `.xp-explorer` section with Eco tokens and add styles for `.eco-menubar`, `.eco-toolbar`, `.eco-addressbar`, `.eco-statusbar`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/desktop/apps/FileManagerApp.tsx src/components/desktop/apps/filemanager/TaskPane.tsx src/components/desktop/apps/filemanager/IconGrid.tsx src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx src/app/globals.css
git commit -m "feat: restyle file manager chrome to eco"
```

---

### Task 5: Eco fallback screens (DB unavailable + client error)

**Files:**
- Create: `src/components/DatabaseUnavailableCard.tsx`
- Create: `src/components/ClientErrorFallback.tsx`
- Create: `src/components/__tests__/eco-fallbacks.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/ClientErrorBoundary.tsx`

**Step 1: Write the failing test**

Create `src/components/__tests__/eco-fallbacks.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import DatabaseUnavailableCard from "../DatabaseUnavailableCard";
import ClientErrorFallback from "../ClientErrorFallback";

describe("eco fallbacks", () => {
  it("renders eco database unavailable card", () => {
    const html = renderToString(<DatabaseUnavailableCard />);
    expect(html).toContain("eco-card");
  });

  it("renders eco client error fallback", () => {
    const html = renderToString(<ClientErrorFallback />);
    expect(html).toContain("eco-card");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/eco-fallbacks.test.tsx`
Expected: FAIL (modules not found).

**Step 3: Write minimal implementation**

Create `src/components/DatabaseUnavailableCard.tsx`:

```tsx
import { EcoCard, EcoCardTitle, EcoNotice, EcoButton } from "@/components/ui/eco";

export default function DatabaseUnavailableCard() {
  return (
    <EcoCard className="stack">
      <EcoCardTitle>Database unavailable</EcoCardTitle>
      <EcoNotice>Start Postgres and refresh the page.</EcoNotice>
      <EcoButton type="button" onClick={() => window.location.reload()}>
        Refresh
      </EcoButton>
    </EcoCard>
  );
}
```

Create `src/components/ClientErrorFallback.tsx`:

```tsx
import { EcoCard, EcoCardTitle, EcoNotice } from "@/components/ui/eco";

export default function ClientErrorFallback() {
  return (
    <EcoCard className="stack">
      <EcoCardTitle>Application error</EcoCardTitle>
      <EcoNotice>Check the browser console for more information.</EcoNotice>
    </EcoCard>
  );
}
```

Update `src/app/page.tsx` to render `DatabaseUnavailableCard` when `status === "dbUnavailable"`.

Update `src/components/ClientErrorBoundary.tsx` to render `ClientErrorFallback` when `hasError` is true.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/eco-fallbacks.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/DatabaseUnavailableCard.tsx src/components/ClientErrorFallback.tsx src/components/__tests__/eco-fallbacks.test.tsx src/app/page.tsx src/components/ClientErrorBoundary.tsx
git commit -m "feat: add eco fallback screens"
```
