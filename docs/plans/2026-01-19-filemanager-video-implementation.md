# File Manager + Video Player Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build File Manager and Video Player modules with per-user filesystem storage, upload, folder management, favorites, and single-file playback.

**Architecture:** Files/folders live on disk under `DATA_DIR/filemanager/<userId>`, with `/video` reserved. Favorites are stored in Postgres. File Manager UI calls App Router API routes; Video Player streams video from a validated file path.

**Tech Stack:** Next.js App Router, NextAuth, Prisma/Postgres, Node fs/path, Vitest.

---

### Task 1: Add file manager path helpers + tests

**Files:**
- Create: `src/lib/filemanager/paths.ts`
- Test: `src/lib/__tests__/filemanager-paths.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  buildUserRoot,
  normalizeRelativePath,
  resolveUserPath,
  isReservedRootFolder,
} from "@/lib/filemanager/paths";

describe("filemanager paths", () => {
  it("normalizes relative paths", () => {
    expect(normalizeRelativePath("/video/../video/a.mp4")).toBe("video/a.mp4");
    expect(normalizeRelativePath("/")).toBe("");
  });

  it("builds user root under data dir", () => {
    expect(buildUserRoot("/data", "user-1")).toBe("/data/filemanager/user-1");
  });

  it("blocks traversal outside user root", () => {
    expect(() => resolveUserPath("/data", "user-1", "../secret.txt")).toThrow();
  });

  it("detects reserved root folders", () => {
    expect(isReservedRootFolder("video")).toBe(true);
    expect(isReservedRootFolder("docs")).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/filemanager-paths.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```ts
import { resolve, relative, posix } from "node:path";

const RESERVED_ROOT = new Set(["video"]);

export function buildUserRoot(dataDir: string, userId: string) {
  return resolve(dataDir, "filemanager", userId);
}

export function normalizeRelativePath(input: string) {
  const cleaned = input.replace(/\\/g, "/").trim();
  const stripped = cleaned.replace(/^\/+/, "");
  const normalized = posix.normalize(stripped);
  return normalized === "." ? "" : normalized;
}

export function resolveUserPath(dataDir: string, userId: string, relativePath: string) {
  const root = buildUserRoot(dataDir, userId);
  const normalized = normalizeRelativePath(relativePath);
  const target = resolve(root, normalized || ".");
  const rel = relative(root, target);
  if (rel.startsWith("..") || rel.includes(".." + posix.sep)) {
    throw new Error("Path escapes user root");
  }
  return { root, target, relative: normalized };
}

export function isReservedRootFolder(name: string) {
  return RESERVED_ROOT.has(name.toLowerCase());
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/filemanager-paths.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/filemanager/paths.ts src/lib/__tests__/filemanager-paths.test.ts
git commit -m "feat: add filemanager path helpers"
```

---

### Task 2: Add Prisma model for video favorites

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Update schema**

```prisma
model VideoFavorite {
  id           String   @id @default(cuid())
  userId       String
  relativePath String
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, relativePath])
  @@index([userId])
}
```

**Step 2: Create migration**

Run: `npx prisma migrate dev --name add-video-favorites`
Expected: new migration file and updated Prisma client

**Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/*
git commit -m "feat: add video favorites model"
```

---

### Task 3: File manager service (fs ops) + tests

**Files:**
- Create: `src/lib/filemanager/service.ts`
- Test: `src/lib/__tests__/filemanager-service.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureUserVideoRoot,
  listEntries,
  createFolder,
  deleteFolder,
  deleteFile,
} from "@/lib/filemanager/service";

describe("filemanager service", () => {
  it("creates video root and lists entries", async () => {
    const base = await mkdtemp(join(tmpdir(), "fm-"));
    await ensureUserVideoRoot(base, "user-1");
    const result = await listEntries(base, "user-1", "");
    expect(result.folders.some((f) => f.name === "video")).toBe(true);
  });

  it("creates and deletes folders", async () => {
    const base = await mkdtemp(join(tmpdir(), "fm-"));
    await ensureUserVideoRoot(base, "user-1");
    await createFolder(base, "user-1", "", "docs");
    const before = await listEntries(base, "user-1", "");
    expect(before.folders.some((f) => f.name === "docs")).toBe(true);
    await deleteFolder(base, "user-1", "docs");
    const after = await listEntries(base, "user-1", "");
    expect(after.folders.some((f) => f.name === "docs")).toBe(false);
  });

  it("deletes files", async () => {
    const base = await mkdtemp(join(tmpdir(), "fm-"));
    await ensureUserVideoRoot(base, "user-1");
    const filePath = join(base, "filemanager", "user-1", "video", "a.mp4");
    await writeFile(filePath, "data");
    await deleteFile(base, "user-1", "video/a.mp4");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/filemanager-service.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```ts
import { mkdir, readdir, stat, unlink, rm } from "node:fs/promises";
import { join } from "node:path";
import { buildUserRoot, isReservedRootFolder, resolveUserPath } from "./paths";

const VIDEO_FOLDER = "video";

export async function ensureUserVideoRoot(dataDir: string, userId: string) {
  const root = buildUserRoot(dataDir, userId);
  await mkdir(join(root, VIDEO_FOLDER), { recursive: true });
  return root;
}

export async function listEntries(dataDir: string, userId: string, relativePath: string) {
  await ensureUserVideoRoot(dataDir, userId);
  const { target } = resolveUserPath(dataDir, userId, relativePath);
  const items = await readdir(target, { withFileTypes: true });
  const folders = [] as { name: string; path: string; updatedAt: string }[];
  const files = [] as { name: string; path: string; size: number; updatedAt: string }[];

  for (const item of items) {
    const itemPath = join(target, item.name);
    const info = await stat(itemPath);
    if (item.isDirectory()) {
      folders.push({
        name: item.name,
        path: [relativePath, item.name].filter(Boolean).join("/"),
        updatedAt: info.mtime.toISOString(),
      });
    } else {
      files.push({
        name: item.name,
        path: [relativePath, item.name].filter(Boolean).join("/"),
        size: info.size,
        updatedAt: info.mtime.toISOString(),
      });
    }
  }

  return { folders, files };
}

export async function createFolder(
  dataDir: string,
  userId: string,
  parentPath: string,
  name: string
) {
  if (!parentPath && isReservedRootFolder(name)) {
    throw new Error("Reserved folder name");
  }
  const { target } = resolveUserPath(dataDir, userId, [parentPath, name].filter(Boolean).join("/"));
  await mkdir(target, { recursive: true });
}

export async function deleteFolder(dataDir: string, userId: string, path: string) {
  if (!path || isReservedRootFolder(path.split("/")[0])) {
    throw new Error("Cannot delete reserved folder");
  }
  const { target } = resolveUserPath(dataDir, userId, path);
  await rm(target, { recursive: true, force: true });
}

export async function deleteFile(dataDir: string, userId: string, path: string) {
  const { target } = resolveUserPath(dataDir, userId, path);
  await unlink(target);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/filemanager-service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/filemanager/service.ts src/lib/__tests__/filemanager-service.test.ts
git commit -m "feat: add filemanager fs service"
```

---

### Task 4: API routes for listing, folders, files, upload, favorites

**Files:**
- Create: `src/app/api/filemanager/list/route.ts`
- Create: `src/app/api/filemanager/folders/route.ts`
- Create: `src/app/api/filemanager/files/route.ts`
- Create: `src/app/api/filemanager/upload/route.ts`
- Create: `src/app/api/filemanager/favorites/route.ts`
- Create: `src/app/api/filemanager/stream/route.ts`
- Create: `src/lib/filemanager/api.ts`
- Test: `src/lib/__tests__/filemanager-api.test.ts`

**Step 1: Write the failing test (list handler)**

```ts
import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listHandler } from "@/lib/filemanager/api";

describe("filemanager list handler", () => {
  it("returns folders/files for a user", async () => {
    const base = await mkdtemp(join(tmpdir(), "fm-"));
    const res = await listHandler({
      dataDir: base,
      userId: "user-1",
      path: "",
    });
    expect(res.folders.some((f) => f.name === "video")).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/filemanager-api.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement API logic in a helper + route wrappers**

```ts
// src/lib/filemanager/api.ts
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { listEntries, createFolder, deleteFolder, deleteFile, ensureUserVideoRoot } from "./service";

export async function listHandler({ dataDir, userId, path }: { dataDir: string; userId: string; path: string }) {
  return listEntries(dataDir, userId, path);
}

export async function createFolderHandler({ dataDir, userId, parentPath, name }: { dataDir: string; userId: string; parentPath: string; name: string }) {
  await createFolder(dataDir, userId, parentPath, name);
  return { ok: true };
}

export async function deleteFolderHandler({ dataDir, userId, path }: { dataDir: string; userId: string; path: string }) {
  await deleteFolder(dataDir, userId, path);
  return { ok: true };
}

export async function deleteFileHandler({ dataDir, userId, path }: { dataDir: string; userId: string; path: string }) {
  await deleteFile(dataDir, userId, path);
  return { ok: true };
}

export async function listFavoritesHandler({ userId }: { userId: string }) {
  const prisma = getPrisma();
  const favorites = await prisma.videoFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return favorites.map((fav) => fav.relativePath);
}
```

```ts
// src/app/api/filemanager/list/route.ts
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { listHandler } from "@/lib/filemanager/api";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "";
  const dataDir = process.env.DATA_DIR?.trim() || "/data";
  try {
    const data = await listHandler({ dataDir, userId: session.user.id, path });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "List failed" }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/filemanager-api.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/filemanager src/lib/filemanager/api.ts
git commit -m "feat: add filemanager api routes"
```

---

### Task 5: Video stream route with range support

**Files:**
- Modify: `src/app/api/filemanager/stream/route.ts`

**Step 1: Add range helper test**

```ts
import { describe, expect, it } from "vitest";
import { parseRange } from "@/lib/filemanager/stream";

describe("parseRange", () => {
  it("parses byte ranges", () => {
    expect(parseRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange("bytes=10-", 100)).toEqual({ start: 10, end: 99 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/filemanager-stream.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement range parser and use it in stream route**

```ts
export function parseRange(range: string | null, size: number) {
  if (!range) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return null;
  return { start, end };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/filemanager-stream.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/filemanager/stream/route.ts src/lib/filemanager/stream.ts src/lib/__tests__/filemanager-stream.test.ts
git commit -m "feat: stream video with range support"
```

---

### Task 6: Video selection store for cross-module open

**Files:**
- Create: `src/lib/videoSelectionStore.ts`
- Test: `src/lib/__tests__/video-selection-store.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { getCurrentVideo, setCurrentVideo } from "@/lib/videoSelectionStore";

describe("video selection store", () => {
  it("stores selection", () => {
    setCurrentVideo({ path: "video/a.mp4", name: "a.mp4" });
    expect(getCurrentVideo()?.path).toBe("video/a.mp4");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/video-selection-store.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```ts
import { useSyncExternalStore } from "react";

type VideoSelection = { path: string; name: string } | null;

let current: VideoSelection = null;
const listeners = new Set<() => void>();

export function getCurrentVideo() {
  return current;
}

export function setCurrentVideo(next: VideoSelection) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCurrentVideo() {
  return useSyncExternalStore(subscribe, getCurrentVideo, getCurrentVideo);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/video-selection-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/videoSelectionStore.ts src/lib/__tests__/video-selection-store.test.ts
git commit -m "feat: add video selection store"
```

---

### Task 7: File Manager UI + styles

**Files:**
- Create: `src/components/desktop/apps/FileManagerApp.tsx`
- Modify: `src/app/globals.css`

**Step 1: Create the component**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { setCurrentVideo } from "@/lib/videoSelectionStore";

type Entry = {
  name: string;
  path: string;
  size?: number;
  updatedAt: string;
  type: "folder" | "file";
  favorite?: boolean;
};

export default function FileManagerApp({ onOpenVideo }: { onOpenVideo: () => void }) {
  // state: path, entries, favorites, loading, error, uploads
  // fetch list + favorites, handle create/delete/upload, handle double click
  return <div className="filemanager">...</div>;
}
```

**Step 2: Add styles for file manager layout**

Add to `src/app/globals.css`:

```css
.filemanager {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
}

.filemanager-sidebar {
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: 10px;
}

.filemanager-list {
  display: grid;
  gap: 6px;
}

.filemanager-row {
  display: grid;
  grid-template-columns: 24px 1fr 120px 140px 24px;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
}

.filemanager-row.selected {
  background: rgba(43, 106, 237, 0.18);
}

.filemanager-upload {
  margin-top: 8px;
}
```

**Step 3: Commit**

```bash
git add src/components/desktop/apps/FileManagerApp.tsx src/app/globals.css
git commit -m "feat: add file manager UI"
```

---

### Task 8: Video Player UI + styles

**Files:**
- Create: `src/components/desktop/apps/VideoPlayerApp.tsx`
- Modify: `src/app/globals.css`

**Step 1: Create the component**

```tsx
"use client";

import { useMemo } from "react";
import { useCurrentVideo } from "@/lib/videoSelectionStore";

export default function VideoPlayerApp() {
  const selection = useCurrentVideo();
  const src = selection
    ? `/api/filemanager/stream?path=${encodeURIComponent(selection.path)}`
    : "";

  return (
    <div className="video-player">
      {selection ? (
        <video controls src={src} />
      ) : (
        <div className="muted">Select a video in File Manager.</div>
      )}
    </div>
  );
}
```

**Step 2: Add styles**

```css
.video-player {
  display: grid;
  place-items: center;
  height: 100%;
}

.video-player video {
  width: 100%;
  max-height: 100%;
  border-radius: 8px;
  background: #000;
}
```

**Step 3: Commit**

```bash
git add src/components/desktop/apps/VideoPlayerApp.tsx src/app/globals.css
git commit -m "feat: add video player UI"
```

---

### Task 9: Add module manifests + icons + registry

**Files:**
- Create: `src/modules/core/filemanager/module.tsx`
- Create: `src/modules/core/video/module.tsx`
- Create: `public/icons/xp/favorite.svg`
- Modify: `src/components/desktop/DesktopShell.tsx`
- Modify: `src/modules/registry.ts`

**Step 1: Add module manifests**

```tsx
import type { ModuleManifest } from "@/modules/types";
import FileManagerApp from "@/components/desktop/apps/FileManagerApp";

const FileManagerWindow: ModuleManifest["Window"] = () => <FileManagerApp />;

export default {
  id: "filemanager",
  title: "File Manager",
  subtitle: "Folders and videos",
  icon: "/icons/xp/folder.png",
  desktopIcon: true,
  startMenu: true,
  Window: FileManagerWindow,
} satisfies ModuleManifest;
```

**Step 2: Connect File Manager double click to video player**

Update `src/components/desktop/DesktopShell.tsx` to pass `openWindow` callback to File Manager module props (add optional prop in FileManager window component signature), or use the store + event when row double clicked.

**Step 3: Generate registry**

Run: `node scripts/generate-modules-registry.mjs`

**Step 4: Commit**

```bash
git add src/modules/core/filemanager/module.tsx src/modules/core/video/module.tsx src/modules/registry.ts src/components/desktop/DesktopShell.tsx public/icons/xp/favorite.svg
git commit -m "feat: add filemanager and video modules"
```

---

### Task 10: Wire favorites + upload + delete UX

**Files:**
- Modify: `src/components/desktop/apps/FileManagerApp.tsx`

**Step 1: Implement favorites toggling**
- Call `POST /api/filemanager/favorites` or `DELETE /api/filemanager/favorites`.
- Update local state on success; revert on failure.

**Step 2: Implement upload with progress (XHR)**
- `const xhr = new XMLHttpRequest();`
- `xhr.upload.onprogress = ...;`
- send `FormData` with `files[]` and `path`.

**Step 3: Implement delete for files/folders**
- Confirm delete (simple `window.confirm` or custom dialog).
- Call `DELETE` route and refresh list.

**Step 4: Commit**

```bash
git add src/components/desktop/apps/FileManagerApp.tsx
git commit -m "feat: filemanager actions"
```

---

### Task 11: Final verification

**Step 1: Run tests**

Run: `npm test`
Expected: PASS

**Step 2: Manual smoke**
- Start app: `npm run dev`
- Verify File Manager list, create/delete folder, upload, toggle favorite.
- Double-click video opens Video Player and plays.

**Step 3: Commit (if needed)**

```bash
git add -A
git commit -m "chore: verify filemanager module"
```
