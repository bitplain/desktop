# Uploads Window + Video Controls Design

**Goal:** Move the upload progress list into a separate XP-style window that auto-opens on upload and auto-closes immediately on completion, and add spacebar play/pause with auto-play after arrow navigation.

## Architecture
- Add a shared upload store (`uploadStore`) that tracks upload items and notifies subscribers.
- Add a new module `uploads` with its own window and UI layout component.
- Extend module props to include `closeWindow` so modules can close themselves.
- File Manager will push upload updates into the store and open the uploads window when uploads start.

## UI Structure
- **Uploads Window**: XP-style content area showing a header "Загрузки", a list of files, and green progress bars. No desktop/start icon.
- **File Manager**: remove inline upload section; only button remains.
- **Video Player**: listens for spacebar to toggle play/pause and auto-plays when selection changes.

## Behaviors
- Upload window auto-opens as soon as any upload starts.
- Upload window auto-closes immediately when all uploads are done or errored; the list clears on close.
- ArrowLeft/ArrowRight keeps navigating the snapshot list; new selection auto-plays.
- Space toggles play/pause without triggering scroll.

## Data Flow
- File Manager starts each upload and updates the `uploadStore` (add/update status).
- Uploads window reads `uploadStore` and closes itself when `hasActiveUploads()` is false.
- Video Player uses `videoKeyNavigation` helper to handle keys and a `videoRef` to control playback.

## Error Handling
- Upload errors remain in the store until the window closes; failures don’t block other uploads.
- Autoplay failures (browser restrictions) are ignored; manual play remains available.

## Testing
- Unit tests for `uploadStore` (add/update/clear/active).
- Update `videoKeyNavigation` tests for spacebar toggle.
- Upload window layout render test for list rendering.
