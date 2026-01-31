# Cutefish Window Chrome Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Унифицировать стиль всех окон под внешний вид FileManager, исправить клики по кнопкам окна и выровнять иконку максимизации.

**Architecture:** Обновляем общий chrome окна и общий компонент XpWindow/XpTitlebar, чтобы все приложения использовали cutefish‑стили и единые кнопки управления. Логику окон не меняем: только стили/разметка и фильтры кликов для drag.

**Tech Stack:** React (Next.js), Vitest, CSS (globals.css)

---

### Task 1: Drag‑handle excludes cutefish controls

**Files:**
- Modify: `src/components/desktop/windowDragHandle.ts`
- Modify: `src/components/desktop/__tests__/window-drag-handle.test.ts`

**Step 1: Write the failing test**

```ts
it("does not start drag from cutefish window controls", () => {
  const target = makeTarget([".cfm-window-btn", ".cfm-window-controls", ".cfm-header"]);
  expect(shouldStartDragForTarget(target, ".cfm-header")).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- window-drag-handle`
Expected: FAIL (drag starts from cutefish controls)

**Step 3: Write minimal implementation**

```ts
if (
  target.closest(".window-controls") ||
  target.closest(".window-resize") ||
  target.closest(".win-buttons") ||
  target.closest(".win-btn") ||
  target.closest(".cfm-window-controls") ||
  target.closest(".cfm-window-btn") ||
  target.closest(".cfm-action-btn") ||
  target.closest(".cfm-nav-btn")
) {
  return false;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- window-drag-handle`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/desktop/windowDragHandle.ts src/components/desktop/__tests__/window-drag-handle.test.ts
git commit -m "fix: prevent drag on cutefish controls"
```

---

### Task 2: Cutefish titlebar for all apps (XpWindow)

**Files:**
- Modify: `src/components/desktop/apps/shared/XpTitlebar.tsx`
- Modify: `src/components/desktop/apps/shared/XpWindow.tsx`
- Modify: `src/components/desktop/apps/shared/XpChrome.tsx`
- Modify: `src/modules/core/about/module.tsx`
- Modify: `src/modules/core/account/module.tsx`
- Modify: `src/modules/core/calculator/module.tsx`
- Modify: `src/modules/core/clock/module.tsx`
- Modify: `src/modules/core/notepad/module.tsx`
- Modify: `src/modules/core/system/module.tsx`
- Modify: `src/modules/core/uploads/module.tsx`
- Modify: `src/modules/core/video/module.tsx`
- Modify: `src/components/desktop/apps/shared/__tests__/xp-window.test.tsx`
- Modify: `src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx`

**Step 1: Write the failing tests**

Update xp-window test to expect cutefish classes:

```ts
expect(html).toContain("cfm-window");
expect(html).toContain("cfm-header");
expect(html).toContain("Свернуть");
```

Update xp-chrome test to expect new wrapper class (e.g. `cfm-chrome`):

```ts
expect(html).toContain("cfm-chrome");
```

**Step 2: Run test to verify it fails**

Run: `npm test -- xp-window xp-chrome`
Expected: FAIL (old eco classes)

**Step 3: Write minimal implementation**

`XpTitlebar.tsx`:
```tsx
export function XpTitlebar({ title }: { title: string }) {
  const controls = useWindowControls();
  const minimize = controls?.minimize ?? (() => undefined);
  const maximize = controls?.maximize ?? (() => undefined);
  const close = controls?.close ?? (() => undefined);

  return (
    <div className="cfm-header cfm-header--app cfm-app-header">
      <div className="cfm-app-title">
        <span className="cfm-app-icon" aria-hidden="true" />
        <span className="cfm-app-name">{title}</span>
      </div>
      <div className="cfm-window-controls" aria-label="Window controls">
        <button type="button" className="cfm-window-btn minimize" aria-label="Свернуть" onClick={minimize} />
        <button type="button" className="cfm-window-btn maximize" aria-label="Развернуть" onClick={maximize} />
        <button type="button" className="cfm-window-btn close" aria-label="Закрыть" onClick={close} />
      </div>
    </div>
  );
}
```

`XpWindow.tsx`:
```tsx
export function XpWindow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="cfm-window cfm-window--app">
      <XpTitlebar title={title} />
      <div className="cfm-app-body">{children}</div>
    </div>
  );
}
```

`XpChrome.tsx`:
```tsx
export function XpChrome({ left, children }: { left: ReactNode; children: ReactNode }) {
  return (
    <div className="cfm-chrome">
      <aside className="cfm-chrome__aside">{left}</aside>
      <section className="cfm-chrome__content">{children}</section>
    </div>
  );
}
```

Update module drag handle selector to new header:
```ts
dragHandleSelector: ".cfm-app-header",
```

**Step 4: Run test to verify it passes**

Run: `npm test -- xp-window xp-chrome`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/desktop/apps/shared/XpTitlebar.tsx src/components/desktop/apps/shared/XpWindow.tsx src/components/desktop/apps/shared/XpChrome.tsx src/components/desktop/apps/shared/__tests__/xp-window.test.tsx src/components/desktop/apps/shared/__tests__/xp-chrome.test.tsx src/modules/core/about/module.tsx src/modules/core/account/module.tsx src/modules/core/calculator/module.tsx src/modules/core/clock/module.tsx src/modules/core/notepad/module.tsx src/modules/core/system/module.tsx src/modules/core/uploads/module.tsx src/modules/core/video/module.tsx
git commit -m "feat: apply cutefish window titlebar across apps"
```

---

### Task 3: Window chrome + CSS alignment

**Files:**
- Modify: `src/components/desktop/Window.tsx`
- Modify: `src/components/desktop/__tests__/window-chrome.test.tsx`
- Modify: `src/app/globals.css`

**Step 1: Write the failing test**

Update window-chrome test to stop expecting eco classes:

```ts
expect(html).toContain("window-header");
expect(html).not.toContain("eco-window");
```

**Step 2: Run test to verify it fails**

Run: `npm test -- window-chrome`
Expected: FAIL (eco classes still rendered)

**Step 3: Write minimal implementation**

`Window.tsx` (remove eco classes/data attributes):
```tsx
className={`window ${isMinimized ? "is-minimized" : ""} ${isMaximized ? "is-maximized" : ""} ${hideChrome ? "window--chromeless" : ""}`}
```

CSS updates in `globals.css`:
- Align `.window`, `.window-header`, `.window-controls`, `.window-control` with cutefish palette
- Fix maximize icon layout:

```css
.cfm-window-btn,
.window-control {
  box-sizing: border-box;
}

.cfm-window-btn.maximize::before,
.window-control.maximize::before {
  box-sizing: border-box;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- window-chrome`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/desktop/Window.tsx src/components/desktop/__tests__/window-chrome.test.tsx src/app/globals.css
git commit -m "feat: unify window chrome with cutefish style"
```

---

### Task 4: Full test run (if available)

**Files:**
- No changes

**Step 1: Run full tests**

Run: `npm test`
Expected: PASS (если упадет из-за внешних причин, зафиксировать в PR)

**Step 2: Commit**

No commit.
