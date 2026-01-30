# Eco Primitive Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Refactor the full web flow (auth/setup + all desktop apps) to use shared Eco Calm UI primitives while preserving XP wallpaper/cursor assets and existing UX.

**Architecture:** Introduce a small set of presentational eco components that only add stable class hooks + `data-eco` attributes, then refactor each screen/app to use those components. Update SSR tests to assert the new `data-eco` hooks so TDD stays intact.

**Tech Stack:** Next.js App Router, React 19, TypeScript, global CSS, Vitest.

---

### Task 1: Create Eco UI primitives

**Files:**
- Create: `src/components/ui/eco/classNames.ts`
- Create: `src/components/ui/eco/EcoPanel.tsx`
- Create: `src/components/ui/eco/EcoForm.tsx`
- Create: `src/components/ui/eco/EcoInput.tsx`
- Create: `src/components/ui/eco/EcoTextarea.tsx`
- Create: `src/components/ui/eco/EcoButton.tsx`
- Create: `src/components/ui/eco/EcoCard.tsx`
- Create: `src/components/ui/eco/EcoCardTitle.tsx`
- Create: `src/components/ui/eco/EcoNotice.tsx`
- Create: `src/components/ui/eco/EcoStat.tsx`
- Create: `src/components/ui/eco/EcoUploadList.tsx`
- Create: `src/components/ui/eco/EcoTaskPane.tsx`
- Create: `src/components/ui/eco/EcoFileGrid.tsx`
- Create: `src/components/ui/eco/EcoAppWindow.tsx`
- Create: `src/components/ui/eco/EcoAppTitlebar.tsx`
- Create: `src/components/ui/eco/EcoChrome.tsx`
- Create: `src/components/ui/eco/index.ts`
- Create: `src/components/ui/eco/__tests__/eco-primitives.test.tsx`

**Step 1: Write the failing test**

`src/components/ui/eco/__tests__/eco-primitives.test.tsx`

```tsx
import { renderToString } from "react-dom/server";
import {
  EcoPanel,
  EcoForm,
  EcoInput,
  EcoTextarea,
  EcoButton,
  EcoCard,
  EcoCardTitle,
  EcoNotice,
  EcoStat,
  EcoUploadList,
  EcoTaskPane,
  EcoFileGrid,
  EcoAppWindow,
  EcoAppTitlebar,
  EcoChrome,
} from "../index";

test("eco primitives add data-eco hooks", () => {
  const html = renderToString(
    <EcoChrome>
      <EcoAppWindow>
        <EcoAppTitlebar>Title</EcoAppTitlebar>
        <EcoPanel>
          <EcoCard>
            <EcoCardTitle>Card</EcoCardTitle>
            <EcoForm>
              <EcoInput value="" onChange={() => undefined} />
              <EcoTextarea value="" onChange={() => undefined} />
              <EcoButton type="button">Ok</EcoButton>
            </EcoForm>
            <EcoStat>42</EcoStat>
            <EcoUploadList />
            <EcoTaskPane />
            <EcoFileGrid />
            <EcoNotice>Note</EcoNotice>
          </EcoCard>
        </EcoPanel>
      </EcoAppWindow>
    </EcoChrome>
  );

  expect(html).toContain('data-eco="panel"');
  expect(html).toContain('data-eco="form"');
  expect(html).toContain('data-eco="input"');
  expect(html).toContain('data-eco="textarea"');
  expect(html).toContain('data-eco="button"');
  expect(html).toContain('data-eco="card"');
  expect(html).toContain('data-eco="card-title"');
  expect(html).toContain('data-eco="notice"');
  expect(html).toContain('data-eco="stat"');
  expect(html).toContain('data-eco="upload-list"');
  expect(html).toContain('data-eco="task-pane"');
  expect(html).toContain('data-eco="file-grid"');
  expect(html).toContain('data-eco="app-window"');
  expect(html).toContain('data-eco="app-titlebar"');
  expect(html).toContain('data-eco="chrome"');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ui/eco/__tests__/eco-primitives.test.tsx`
Expected: FAIL (missing modules/components).

**Step 3: Implement minimal eco primitives**

Example shape (repeat for each component):

```tsx
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "./classNames";

type EcoPanelProps = ComponentPropsWithoutRef<"div">;

export function EcoPanel({ className, ...props }: EcoPanelProps) {
  return <div {...props} className={cx("eco-panel", className)} data-eco="panel" />;
}
```

Notes:
- `EcoForm` uses `<form>` with `data-eco="form"`
- `EcoInput` uses `<input>` and forwards props
- `EcoTextarea` uses `<textarea>`
- `EcoButton` uses `<button>` and supports `variant?: "primary" | "secondary"`
- `EcoNotice` uses `className="notice eco-notice"`
- `EcoCard` / `EcoCardTitle` use existing `eco-card` / `eco-card-title` classes
- `EcoUploadList` uses `eco-upload-list`
- `EcoTaskPane` uses `eco-task-pane`
- `EcoFileGrid` uses `eco-file-grid`
- `EcoAppWindow` uses `eco-app-window`
- `EcoAppTitlebar` uses `eco-app-titlebar`
- `EcoChrome` uses `eco-chrome`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ui/eco/__tests__/eco-primitives.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/ui/eco

git commit -m "feat: add eco ui primitives"
```

---

### Task 2: Window chrome + shared app chrome use eco primitives

**Files:**
- Modify: `src/components/desktop/Window.tsx`
- Modify: `src/components/desktop/apps/shared/XpWindow.tsx`
- Modify: `src/components/desktop/apps/shared/XpTitlebar.tsx`
- Modify: `src/components/desktop/apps/shared/XpChrome.tsx`
- Modify: `src/components/desktop/__tests__/window-chrome.test.tsx`
- Modify: `src/components/desktop/apps/shared/__tests__/xp-window.test.tsx`
- Modify: `src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx`

**Step 1: Write the failing tests**

Update tests to assert `data-eco` hooks.

`src/components/desktop/__tests__/window-chrome.test.tsx`

```tsx
expect(html).toContain('data-eco="window"');
```

`src/components/desktop/apps/shared/__tests__/xp-window.test.tsx`

```tsx
expect(html).toContain('data-eco="app-window"');
expect(html).toContain('data-eco="app-titlebar"');
```

`src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx`

```tsx
expect(html).toContain('data-eco="chrome"');
```

**Step 2: Run tests to verify they fail**

Run:
`npm test -- src/components/desktop/__tests__/window-chrome.test.tsx src/components/desktop/apps/shared/__tests__/xp-window.test.tsx src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx`

Expected: FAIL (missing data-eco attributes).

**Step 3: Implement minimal markup updates**

Use eco primitives in the chrome components.

```tsx
import { EcoAppWindow } from "@/components/ui/eco";

return (
  <EcoAppWindow className="xp-window">
    ...
  </EcoAppWindow>
);
```

```tsx
import { EcoAppTitlebar } from "@/components/ui/eco";

return (
  <EcoAppTitlebar className="titlebar">
    ...
  </EcoAppTitlebar>
);
```

```tsx
import { EcoChrome } from "@/components/ui/eco";

return (
  <EcoChrome className="xp-chrome">
    ...
  </EcoChrome>
);
```

For `Window.tsx`, add `data-eco="window"` on the root `section` (or wrap with a tiny `EcoWindowFrame` helper).

**Step 4: Run tests to verify they pass**

Run:
`npm test -- src/components/desktop/__tests__/window-chrome.test.tsx src/components/desktop/apps/shared/__tests__/xp-window.test.tsx src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/Window.tsx src/components/desktop/apps/shared/XpWindow.tsx src/components/desktop/apps/shared/XpTitlebar.tsx src/components/desktop/apps/shared/XpChrome.tsx src/components/desktop/__tests__/window-chrome.test.tsx src/components/desktop/apps/shared/__tests__/xp-window.test.tsx src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx

git commit -m "feat: wire window chrome to eco primitives"
```

---

### Task 3: Auth pages + setup wizard use eco primitives

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/setup/SetupWizard.tsx`
- Modify: `src/app/__tests__/auth-screens.test.tsx`
- Modify: `src/app/setup/__tests__/setup-wizard-layout.test.tsx`

**Step 1: Write the failing tests**

`src/app/__tests__/auth-screens.test.tsx`

```tsx
expect(loginHtml).toContain('data-eco="card"');
expect(loginHtml).toContain('data-eco="input"');
expect(loginHtml).toContain('data-eco="button"');
```

`src/app/setup/__tests__/setup-wizard-layout.test.tsx`

```tsx
expect(html).toContain('data-eco="card"');
expect(html).toContain('data-eco="form"');
```

**Step 2: Run tests to verify they fail**

Run:
`npm test -- src/app/__tests__/auth-screens.test.tsx src/app/setup/__tests__/setup-wizard-layout.test.tsx`

Expected: FAIL.

**Step 3: Implement minimal markup updates**

Use eco primitives, preserving existing classes for layout.

Examples:

```tsx
<EcoCard className="auth-card">
  ...
  <EcoForm className="auth-form-body" onSubmit={onSubmit}>
    <EcoInput ... />
    <EcoButton ...>...</EcoButton>
  </EcoForm>
</EcoCard>
```

**Step 4: Run tests to verify they pass**

Run:
`npm test -- src/app/__tests__/auth-screens.test.tsx src/app/setup/__tests__/setup-wizard-layout.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/login/page.tsx src/app/register/page.tsx src/app/setup/SetupWizard.tsx src/app/__tests__/auth-screens.test.tsx src/app/setup/__tests__/setup-wizard-layout.test.tsx

git commit -m "feat: auth flows use eco primitives"
```

---

### Task 4: Account + system apps use eco primitives

**Files:**
- Modify: `src/components/desktop/apps/AccountApp.tsx`
- Modify: `src/components/desktop/apps/SystemApp.tsx`
- Modify: `src/components/desktop/apps/__tests__/account-system-ui.test.tsx`

**Step 1: Write the failing tests**

`src/components/desktop/apps/__tests__/account-system-ui.test.tsx`

```tsx
expect(accountHtml).toContain('data-eco="panel"');
expect(accountHtml).toContain('data-eco="form"');
expect(accountHtml).toContain('data-eco="input"');
expect(accountHtml).toContain('data-eco="button"');
expect(systemHtml).toContain('data-eco="panel"');
```

**Step 2: Run tests to verify they fail**

Run:
`npm test -- src/components/desktop/apps/__tests__/account-system-ui.test.tsx`

Expected: FAIL.

**Step 3: Implement minimal markup updates**

Use `EcoPanel`, `EcoForm`, `EcoInput`, `EcoButton`, `EcoNotice` in both apps.

**Step 4: Run tests to verify they pass**

Run:
`npm test -- src/components/desktop/apps/__tests__/account-system-ui.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/apps/AccountApp.tsx src/components/desktop/apps/SystemApp.tsx src/components/desktop/apps/__tests__/account-system-ui.test.tsx

git commit -m "feat: account and system apps use eco primitives"
```

---

### Task 5: Utility apps use eco primitives

**Files:**
- Modify: `src/components/desktop/apps/NotepadApp.tsx`
- Modify: `src/components/desktop/apps/ClockApp.tsx`
- Modify: `src/components/desktop/apps/CalculatorApp.tsx`
- Modify: `src/components/desktop/apps/AboutApp.tsx`
- Modify: `src/components/desktop/apps/VideoPlayerApp.tsx`
- Modify: `src/components/desktop/apps/UploadManagerApp.tsx`
- Modify: `src/components/desktop/apps/__tests__/upload-manager-layout.test.tsx`
- Create: `src/components/desktop/apps/__tests__/utility-apps-ui.test.tsx`

**Step 1: Write the failing tests**

`src/components/desktop/apps/__tests__/utility-apps-ui.test.tsx`

```tsx
import { renderToString } from "react-dom/server";
import NotepadApp from "../NotepadApp";
import ClockApp from "../ClockApp";
import CalculatorApp from "../CalculatorApp";
import AboutApp from "../AboutApp";
import VideoPlayerApp from "../VideoPlayerApp";

test("utility apps render eco primitives", () => {
  expect(renderToString(<NotepadApp />)).toContain('data-eco="card"');
  expect(renderToString(<ClockApp />)).toContain('data-eco="stat"');
  expect(renderToString(<CalculatorApp />)).toContain('data-eco="button"');
  expect(renderToString(<AboutApp />)).toContain('data-eco="notice"');
  expect(renderToString(<VideoPlayerApp />)).toContain('data-eco="card"');
});
```

Update `src/components/desktop/apps/__tests__/upload-manager-layout.test.tsx`:

```tsx
expect(html).toContain('data-eco="upload-list"');
```

**Step 2: Run tests to verify they fail**

Run:
`npm test -- src/components/desktop/apps/__tests__/utility-apps-ui.test.tsx src/components/desktop/apps/__tests__/upload-manager-layout.test.tsx`

Expected: FAIL.

**Step 3: Implement minimal markup updates**

Use `EcoCard`, `EcoCardTitle`, `EcoTextarea`, `EcoStat`, `EcoButton`, `EcoNotice`, `EcoUploadList` in the utility apps.

**Step 4: Run tests to verify they pass**

Run:
`npm test -- src/components/desktop/apps/__tests__/utility-apps-ui.test.tsx src/components/desktop/apps/__tests__/upload-manager-layout.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/apps/NotepadApp.tsx src/components/desktop/apps/ClockApp.tsx src/components/desktop/apps/CalculatorApp.tsx src/components/desktop/apps/AboutApp.tsx src/components/desktop/apps/VideoPlayerApp.tsx src/components/desktop/apps/UploadManagerApp.tsx src/components/desktop/apps/__tests__/utility-apps-ui.test.tsx src/components/desktop/apps/__tests__/upload-manager-layout.test.tsx

git commit -m "feat: utility apps use eco primitives"
```

---

### Task 6: File Manager uses eco primitives + eco layout polish

**Files:**
- Modify: `src/components/desktop/apps/FileManagerApp.tsx`
- Modify: `src/components/desktop/apps/filemanager/TaskPane.tsx`
- Modify: `src/components/desktop/apps/filemanager/IconGrid.tsx`
- Modify: `src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx`
- Modify: `src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`
- Modify: `src/app/globals.css`

**Step 1: Write the failing tests**

`src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx`

```tsx
expect(html).toContain('data-eco="task-pane"');
```

`src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`

```tsx
expect(html).toContain('data-eco="file-grid"');
```

**Step 2: Run tests to verify they fail**

Run:
`npm test -- src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`

Expected: FAIL.

**Step 3: Implement minimal markup updates**

Use `EcoTaskPane` and `EcoFileGrid` in the file manager components.

Example:

```tsx
<EcoTaskPane className="task-pane">...</EcoTaskPane>
<EcoFileGrid className="grid">...</EcoFileGrid>
```

Add the Eco Calm layout polish in `src/app/globals.css`:

```css
.eco-filemanager {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 12px;
}

.eco-task-pane {
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 12px;
}

.eco-file-grid {
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 12px;
}
```

**Step 4: Run tests to verify they pass**

Run:
`npm test -- src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/desktop/apps/FileManagerApp.tsx src/components/desktop/apps/filemanager/TaskPane.tsx src/components/desktop/apps/filemanager/IconGrid.tsx src/components/desktop/apps/filemanager/__tests__/task-pane.test.tsx src/components/desktop/apps/filemanager/__tests__/xp-explorer-layout.test.tsx src/app/globals.css

git commit -m "feat: file manager uses eco primitives"
```

---

### Task 7: Full test pass

**Step 1: Run full test suite**

Run: `npm test`

Expected: PASS.

**Step 2: Commit any leftover polish**

```bash
git status -sb
```

If there are uncommitted adjustments:

```bash
git add -A

git commit -m "chore: eco primitive refactor polish"
```

---
