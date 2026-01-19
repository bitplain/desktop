# File Manager + Video Player (Module 1)

## Goals
- Add a File Manager module with per-user filesystem storage rooted at `/data/filemanager/<userId>`.
- Reserve `/video` under each user root for video content; File Manager can create/delete other folders at the root and deeper levels.
- Add a Video Player module that opens a selected video from File Manager (single-file playback).
- Support upload (multiple files with progress), delete, folder create/delete, and video favorites.
- Keep UI consistent with the existing XP shell styling.

## Non-goals
- Playlists/queues or multi-file playback.
- Server-side transcoding or format conversion.
- External storage providers.

## Architecture
- Two desktop modules:
  - `FileManager` module: file/folder navigation, upload, favorites.
  - `VideoPlayer` module: plays one selected file at a time.
- Storage:
  - Files/folders stored on server disk under `DATA_DIR` (default `/data`).
  - User root: `/data/filemanager/<userId>`.
  - Reserved folder: `/video` (always present; managed by the system).
- Metadata:
  - Favorites stored in Postgres via Prisma model `VideoFavorite` with unique `(userId, relativePath)`.
- Auth:
  - All file APIs require session; user id from NextAuth session (`session.user.id`).
- Path safety:
  - All API paths normalized and validated with `path.resolve` and `path.relative` to prevent traversal.

## UI/UX
- File Manager window:
  - Left sidebar with quick folders: `Видео`, `Избранное`, `Корень`.
  - Right pane list/grid of folders/files with XP icons, size, modified date.
  - Action bar: `Создать папку`, `Загрузить`, `Удалить`.
  - Upload queue panel with per-file progress bars (XP style).
- Favorites:
  - Star toggle on video rows.
  - Favorites view shows only favorited videos.
- Video Player window:
  - XP-style frame and a centered `<video>` element with standard controls.
  - Empty state if no file selected.
- Desktop:
  - Add icons/Start Menu entries for both modules.
  - Double-click video in File Manager opens Video Player and passes the file.

## Data Flow & API
- List:
  - `GET /api/filemanager/list?path=/` -> folders/files under a path.
- Create folder:
  - `POST /api/filemanager/folders` with `{ parentPath, name }`.
- Delete folder:
  - `DELETE /api/filemanager/folders` with `{ path }`.
- Delete file:
  - `DELETE /api/filemanager/files` with `{ path }`.
- Upload:
  - `POST /api/filemanager/upload` with `multipart/form-data` (`files[]`, `path`).
  - Client uses `XMLHttpRequest` for progress events.
- Favorites:
  - `GET /api/filemanager/favorites?scope=video`.
  - `POST /api/filemanager/favorites` with `{ path }`.
  - `DELETE /api/filemanager/favorites` with `{ path }`.
- Stream video:
  - `GET /api/filemanager/stream?path=...` -> validates path and returns file stream.

## Error Handling
- API returns JSON errors with status codes (400/403/404/409/500).
- UI shows XP-style inline alert for operation failures.
- Upload failures show per-item error state with retry.
- Favorites list gracefully handles missing files (allows removal).

## Testing
- Unit tests for path validation helpers and reserved folder rules.
- Route handler tests for folder creation and delete safety.

## Notes
- Allowed formats: H.264 MP4 and HEVC.
- No file size limit enforced by app logic.
- Future reserved folders (e.g., `/music`) can be added under user root.
