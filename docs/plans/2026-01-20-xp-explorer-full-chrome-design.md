# XP Explorer Full Chrome Design

**Goal:** Match the `screen/index.html` + `screen/style.css` XP Explorer mock inside the File Manager while keeping existing functionality and avoiding double window chrome.

## Architecture
- Add optional window chrome controls to `ModuleManifest` (e.g., `hideChrome`, `dragHandleSelector`).
- Update the desktop `Window` to hide the outer chrome when requested and enable dragging only from the inner XP titlebar selector.
- Rebuild the File Manager layout to mirror the mock: titlebar, menubar, toolbar, address bar, task pane, file grid, status bar.

## UI Structure
- **Inner XP titlebar**: used as the drag handle; includes faux buttons wired to window controls.
- **Menubar/Toolbar**: visual only (non-functional).
- **Address bar**: shows `video`, `favorites`, or `root` path.
- **Task pane**: XP card layout from the mock with links mapped to actual actions.
- **File grid**: large icon tiles using the mock sizes/spacing; selection highlight and favorite overlay.
- **Status bar**: left shows item count, right shows selected size or placeholder.

## Behavior
- File Manager behavior unchanged: create/delete folders, delete files, open videos on double click, favorites toggle.
- Task pane action links: create folder, add file, delete selected.
- “Other Places” links switch view: Video, Favorites, Root.

## Styling
- Copy `screen/style.css` styles into `globals.css` under a `.xp-explorer` scope to avoid conflicts.
- Replace mock `.window` styles with `.xp-explorer` wrapper inside the file manager content.
- Keep existing XP taskbar styles and desktop aesthetics intact.

## Error Handling
- Preserve error messages in the details section (XP card).
- If outer window chrome is hidden, window controls remain functional via inner titlebar buttons.

## Testing
- Update layout snapshot tests to validate key XP sections render (titlebar, task pane, status bar).
- Smoke test for the new `hideChrome` module option.
