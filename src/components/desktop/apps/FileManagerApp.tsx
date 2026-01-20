"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setVideoSelection } from "@/lib/videoSelectionStore";
import { addUpload, updateUpload } from "@/lib/uploadStore";
import { XpChrome } from "@/components/desktop/apps/shared/XpChrome";
import { TaskPane, type FileManagerView } from "@/components/desktop/apps/filemanager/TaskPane";
import {
  IconGrid,
  type FileManagerEntry,
} from "@/components/desktop/apps/filemanager/IconGrid";

const VIEW_VIDEO: FileManagerView = "video";
const VIEW_FAVORITES: FileManagerView = "favorites";
const VIEW_ROOT: FileManagerView = "root";

type FolderEntry = {
  name: string;
  path: string;
  updatedAt: string;
};

type FileEntry = {
  name: string;
  path: string;
  size: number | null;
  updatedAt: string;
};

type Entry = (FolderEntry | FileEntry) & { type: "folder" | "file" };

function buildPath(base: string, name: string) {
  return [base, name].filter(Boolean).join("/");
}

export default function FileManagerApp({
  onOpenVideo,
  onOpenUploads,
}: {
  onOpenVideo: () => void;
  onOpenUploads: () => void;
}) {
  const [view, setView] = useState<FileManagerView>(VIEW_VIDEO);
  const [currentPath, setCurrentPath] = useState("video");
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const entries: Entry[] = useMemo(() => {
    const folderEntries = folders.map((folder) => ({ ...folder, type: "folder" as const }));
    const fileEntries = files.map((file) => ({ ...file, type: "file" as const }));
    return [...folderEntries, ...fileEntries];
  }, [folders, files]);

  const favoritesList = useMemo(() => {
    const map = new Map(files.map((file) => [file.path, file]));
    return Array.from(favorites).map((path) => {
      const existing = map.get(path);
      if (existing) {
        return existing;
      }
      const name = path.split("/").pop() ?? path;
      return { name, path, size: null, updatedAt: "" } satisfies FileEntry;
    });
  }, [files, favorites]);

  const activeFiles = view === VIEW_FAVORITES ? favoritesList : files;

  const listPath = view === VIEW_ROOT ? "" : currentPath;

  const gridEntries: FileManagerEntry[] = useMemo(() => {
    if (view === VIEW_FAVORITES) {
      return favoritesList.map((file) => ({
        type: "file",
        name: file.name,
        path: file.path,
      }));
    }
    return entries.map((entry) => ({
      type: entry.type,
      name: entry.name,
      path: entry.path,
    }));
  }, [entries, favoritesList, view]);

  const isEmpty = view === VIEW_FAVORITES ? favoritesList.length === 0 : entries.length === 0;

  const selectedLabel = useMemo(() => {
    if (!selectedPath) return null;
    const match = gridEntries.find((entry) => entry.path === selectedPath);
    return match?.name ?? null;
  }, [gridEntries, selectedPath]);

  const loadFavorites = async () => {
    const res = await fetch("/api/filemanager/favorites");
    if (!res.ok) return;
    const data = (await res.json()) as { favorites: string[] };
    setFavorites(new Set(data.favorites ?? []));
  };

  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/filemanager/list?path=${encodeURIComponent(listPath)}`);
      if (!res.ok) {
        throw new Error("Не удалось загрузить файлы");
      }
      const data = (await res.json()) as {
        folders: FolderEntry[];
        files: FileEntry[];
      };
      setFolders(data.folders ?? []);
      setFiles(data.files ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
    loadFavorites();
  }, [listPath]);

  const handleViewChange = (nextView: FileManagerView) => {
    setView(nextView);
    setSelectedPath(null);
    setError(null);
    if (nextView === VIEW_ROOT) {
      setCurrentPath("");
      return;
    }
    setCurrentPath("video");
  };

  const openFolder = (folder: { name: string; path: string }) => {
    if (view === VIEW_FAVORITES) return;
    const nextPath = buildPath(listPath, folder.name);
    setCurrentPath(nextPath);
    setView(VIEW_VIDEO);
    setSelectedPath(null);
  };

  const handleOpenEntry = (entry: FileManagerEntry) => {
    if (entry.type === "folder") {
      openFolder(entry);
      return;
    }
    const normalizedPath = entry.path.startsWith("video/")
      ? entry.path
      : buildPath(listPath, entry.name);
    if (!normalizedPath.startsWith("video/")) {
      setError("Видео доступны только внутри папки video.");
      return;
    }
    const playlist = activeFiles.map((file) => ({
      path: file.path,
      name: file.name,
    }));
    const hasItem = playlist.some((item) => item.path === normalizedPath);
    if (!hasItem) {
      playlist.unshift({ path: normalizedPath, name: entry.name });
    }
    setVideoSelection(playlist, normalizedPath);
    onOpenVideo();
  };

  const handleCreateFolder = async () => {
    const name = window.prompt("Имя папки");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const parentPath = view === VIEW_ROOT ? "" : listPath;
    try {
      const res = await fetch("/api/filemanager/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPath, name: trimmed }),
      });
      if (!res.ok) {
        throw new Error("Не удалось создать папку");
      }
      await loadEntries();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка";
      setError(message);
    }
  };

  const handleDelete = async () => {
    if (!selectedPath) return;
    const directEntry = entries.find((item) => item.path === selectedPath);
    const fileEntry = activeFiles.find((item) => item.path === selectedPath);
    const entry: Entry | null =
      directEntry ?? (fileEntry ? { ...fileEntry, type: "file" } : null);
    if (!entry) return;
    const confirmed = window.confirm(`Удалить ${entry.name}?`);
    if (!confirmed) return;

    try {
      const url = entry.type === "folder" ? "/api/filemanager/folders" : "/api/filemanager/files";
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: entry.path }),
      });
      if (!res.ok) {
        throw new Error("Не удалось удалить");
      }
      setSelectedPath(null);
      await loadEntries();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка";
      setError(message);
    }
  };

  const toggleFavorite = async (file: FileEntry) => {
    const isFavorite = favorites.has(file.path);
    const next = new Set(favorites);
    if (isFavorite) {
      next.delete(file.path);
    } else {
      next.add(file.path);
    }
    setFavorites(next);

    const res = await fetch("/api/filemanager/favorites", {
      method: isFavorite ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: file.path }),
    });
    if (!res.ok) {
      setFavorites(favorites);
    }
  };

  const handleUpload = (filesToUpload: FileList | null) => {
    if (!filesToUpload || filesToUpload.length === 0) return;
    onOpenUploads();
    const parentPath = view === VIEW_ROOT ? "" : listPath;

    Array.from(filesToUpload).forEach((file) => {
      const id = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`;
      const item = {
        id,
        name: file.name,
        progress: 0,
        status: "queued",
      };
      addUpload(item);

      const formData = new FormData();
      formData.append("files", file);
      formData.append("path", parentPath);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/filemanager/upload");
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        updateUpload(id, { progress, status: "uploading" });
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updateUpload(id, { progress: 100, status: "done" });
          loadEntries();
          return;
        }
        updateUpload(id, { status: "error", error: "Ошибка загрузки" });
      };
      xhr.onerror = () => {
        updateUpload(id, { status: "error", error: "Ошибка загрузки" });
      };
      xhr.send(formData);
    });
  };

  return (
    <XpChrome
      left={
        <TaskPane
          view={view}
          loading={loading}
          error={error}
          selectedLabel={selectedLabel}
          onViewChange={handleViewChange}
          onCreateFolder={handleCreateFolder}
          onUpload={() => fileInputRef.current?.click()}
          onDelete={handleDelete}
        />
      }
    >
      <div className="filemanager-view">
        <div className="filemanager-address">
          <span className="filemanager-address-label">Адрес:</span>
          <span className="filemanager-address-value">
            {view === VIEW_FAVORITES ? "Избранное" : listPath || "Корень"}
          </span>
        </div>
        <IconGrid
          view={view}
          entries={gridEntries}
          favorites={favorites}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
          onOpen={handleOpenEntry}
          onToggleFavorite={(entry) => {
            const file = activeFiles.find((item) => item.path === entry.path);
            if (file) toggleFavorite(file);
          }}
          onOpenFavorites={() => handleViewChange(VIEW_FAVORITES)}
          onOpenVideo={() => handleViewChange(VIEW_VIDEO)}
        />

        {!loading && isEmpty ? (
          <div className="muted">Папка пуста.</div>
        ) : null}

      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/mp4"
        className="filemanager-hidden"
        onChange={(event) => handleUpload(event.target.files)}
      />
    </XpChrome>
  );
}
