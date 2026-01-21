# XP File Manager Shell Design

**Goal:** Match the XP task pane + icon grid look for the file manager, reuse the layout for future modules, and improve video sizing and keyboard navigation in the video module.

## Architecture
- Add a shared XP chrome wrapper component that renders a left task pane slot and a right content pane slot.
- File Manager plugs `TaskPane` into the left slot and `IconGrid` into the right slot.
- Video Player keeps its full-bleed player area but can optionally reuse the wrapper for consistent chrome later.

## UI Structure
- **TaskPane** sections: System Tasks, Tasks for files and folders, Other Places, Details.
- **Other Places** includes shortcuts to Video and Favorites.
- **IconGrid** renders large XP-style tiles in a wrapping row layout; includes a Favorites tile plus the Video folder.
- Selection: XP highlight and caption styling. Double-click opens folder or video.

## Behaviors
- Favorites view: available via left pane link and grid tile; renders only favorite videos.
- Folder operations: create/delete allowed at `filemanager/<userId>` level; `/video` remains reserved.
- Opening video: snapshot current visible list into a shared selection store for navigation.
- Video navigation: ArrowLeft/ArrowRight moves within the snapshot list; clamp at edges (no wrap).
- Video sizing: use `object-fit: cover` so the video fills the player and resizes with the window (accepts cropping).

## Data Flow
- File Manager builds the visible list and calls `setVideoSelection(list, currentPath)` when opening.
- Video Player reads `useCurrentVideo()` and calls `moveVideoSelection(delta)` on key events.

## Error Handling
- Inline status text in Details section for file operations and upload errors.
- Disabled delete actions when no selection.

## Testing
- Update video selection store tests to cover snapshot list + edge clamping.
- Add a smoke test for XP chrome wrapper to verify both panes render.
- Manual visual check against the XP screenshots.
