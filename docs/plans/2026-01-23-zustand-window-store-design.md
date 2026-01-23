# Zustand Window Store Design

## Goal
Replace the local window state in `DesktopShell` with a centralized Zustand store to improve scalability, reduce unnecessary re-renders, and enable future extensions like server-backed layouts.

## Architecture
Create a `useWindowStore` in `src/stores/windowStore.ts` using Zustand `create` with `devtools` middleware. State is normalized to avoid array scans: `windowsById` (record keyed by id), `order` (z-order list), `activeId`, and `viewport`. Each window holds `id`, `title`, `icon`, `position`, `size`, `isOpen`, `isMinimized`, `isMaximized`, `zIndex`, and optional `restore`. Actions mutate state through `set(state => ...)` and are named for devtools visibility. Core actions include `initWindows`, `open`, `close`, `focus`, `minimize`, `maximize`, `restore`, `move`, `resize`, `bringToFront`, `setViewport`, `applyLayout`, `hydrateLayout`, and `resetLayout`.

## Components and Data Flow
`DesktopShell` becomes a thin orchestrator: it builds window configs, initializes the store once, and subscribes to selectors for `order`, `openIds`, and `windowsById`. `Window` receives only `id` and uses selectors to read its state; actions are pulled directly from the store. `Taskbar`, `StartMenu`, and `DesktopIcons` call `open(id)` and subscribe to minimal slices. A single resize listener in `DesktopShell` updates `viewport` so all window bounds are clamped centrally. Layout persistence uses `hydrateLayout` on startup and `persistLayout` (debounced) on actions; this isolates storage to the store and keeps UI components pure.

## Error Handling and Edge Cases
Actions validate input and no-op when the target window is closed or missing. Restore operations fall back to safe sizes if `restore` data is absent. All size/position updates are clamped with existing `windowBounds` utilities to prevent off-screen placement. Layout actions ensure only open windows are affected and preserve minimized state.

## Performance Strategy
Selectors are used everywhere to avoid re-rendering unrelated windows. Drag/resize uses local refs and writes to the store on pointer-up to avoid high-frequency store updates. Batch operations (tile/cascade) run in a single `set` call. Devtools middleware is enabled for debugging without affecting production behavior.

## Testing Plan
Pure functions for bounds and layouts remain testable independently. Store action tests validate state transitions (open/close/focus/minimize/maximize/restore/resize). UI tests cover smoke scenarios: open window, bring to front, minimize/restore, and layout actions.

## Migration Plan
1. Add `useWindowStore` and adapt `DesktopShell` to read from the store.
2. Update `Window`, `Taskbar`, and desktop entry points to use selectors/actions.
3. Remove legacy local state and ensure layout persistence lives in the store.
