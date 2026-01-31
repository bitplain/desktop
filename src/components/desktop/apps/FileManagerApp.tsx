"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setVideoSelection } from "@/lib/videoSelectionStore";
import { addUpload, updateUpload, type UploadItem } from "@/lib/uploadStore";
import { HeaderBar } from "@/components/desktop/apps/filemanager/HeaderBar";
import { PathBar } from "@/components/desktop/apps/filemanager/PathBar";
import { Sidebar } from "@/components/desktop/apps/filemanager/Sidebar";
import { StatusBar } from "@/components/desktop/apps/filemanager/StatusBar";
import {
  IconGrid,
  type FileManagerEntry,
} from "@/components/desktop/apps/filemanager/IconGrid";

type FileManagerView = "path" | "favorites";

type FileManagerLayout = "grid" | "list";

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
  userEmail,
}: {
  onOpenVideo: () => void;
  onOpenUploads: () => void;
  userEmail?: string | null;
}) {
  const [view, setView] = useState<FileManagerView>("path");
  const [currentPath, setCurrentPath] = useState("");
  const [layout, setLayout] = useState<FileManagerLayout>("grid");
  const [history, setHistory] = useState<string[]>([""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);
  const lastPathRef = useRef("");
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

  const activeFiles = view === "favorites" ? favoritesList : files;

  const listPath = view === "favorites" ? "video" : currentPath;

  const gridEntries: FileManagerEntry[] = useMemo(() => {
    if (view === "favorites") {
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

  const isEmpty = view === "favorites" ? favoritesList.length === 0 : entries.length === 0;

  const selectedLabel = useMemo(() => {
    if (!selectedPath) return null;
    const match = gridEntries.find((entry) => entry.path === selectedPath);
    return match?.name ?? null;
  }, [gridEntries, selectedPath]);

  const statusCount = view === "favorites" ? favoritesList.length : entries.length;

  const userLabel = userEmail?.split("@")[0] ?? "Guest";

  const canGoBack = view === "favorites" ? Boolean(lastPathRef.current) : historyIndex > 0;
  const canGoForward = view === "favorites" ? false : historyIndex < history.length - 1;

  const sidebarActiveKey = useMemo(() => {
    if (view === "favorites") return "home";
    if (!currentPath) return "home";
    if (currentPath.startsWith("video")) return "videos";
    if (currentPath.startsWith("foto")) return "pictures";
    return "home";
  }, [currentPath, view]);

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

  const pushHistory = (path: string) => {
    const nextHistory = [...history.slice(0, historyIndex + 1), path];
    historyIndexRef.current = nextHistory.length - 1;
    setHistory(nextHistory);
    setHistoryIndex(historyIndexRef.current);
  };

  const navigateTo = (path: string, push = true) => {
    setView("path");
    setCurrentPath(path);
    setSelectedPath(null);
    setError(null);
    if (push) {
      pushHistory(path);
    }
  };

  const openFavorites = () => {
    if (view !== "favorites") {
      lastPathRef.current = currentPath;
    }
    setView("favorites");
    setSelectedPath(null);
    setError(null);
  };

  const handleBack = () => {
    if (view === "favorites") {
      navigateTo(lastPathRef.current || "", false);
      return;
    }
    if (historyIndexRef.current <= 0) return;
    const nextIndex = historyIndexRef.current - 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setCurrentPath(history[nextIndex] ?? "");
    setSelectedPath(null);
    setError(null);
  };

  const handleForward = () => {
    if (view === "favorites") return;
    if (historyIndexRef.current >= history.length - 1) return;
    const nextIndex = historyIndexRef.current + 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setCurrentPath(history[nextIndex] ?? "");
    setSelectedPath(null);
    setError(null);
  };

  const handleUp = () => {
    if (view === "favorites") {
      navigateTo(lastPathRef.current || "", false);
      return;
    }
    if (!currentPath) return;
    const segments = currentPath.split("/").filter(Boolean);
    segments.pop();
    navigateTo(segments.join("/"));
  };

  const openFolder = (folder: { name: string; path: string }) => {
    if (view === "favorites") return;
    const nextPath = buildPath(listPath, folder.name);
    navigateTo(nextPath);
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
    const parentPath = listPath;
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
    const parentPath = listPath;

    Array.from(filesToUpload).forEach((file) => {
      const id = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`;
      const item: UploadItem = {
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
    <div className="cfm-window" role="application" aria-label="File Manager">
      <HeaderBar
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        layout={layout}
        canDelete={Boolean(selectedPath)}
        favoritesActive={view === "favorites"}
        onBack={handleBack}
        onForward={handleForward}
        onUp={handleUp}
        onCreateFolder={handleCreateFolder}
        onUpload={() => fileInputRef.current?.click()}
        onDelete={handleDelete}
        onOpenFavorites={openFavorites}
        onLayoutChange={setLayout}
      >
        <PathBar
          userLabel={userLabel}
          path={view === "favorites" ? "video" : currentPath}
          onNavigate={(path) => navigateTo(path)}
        />
      </HeaderBar>

      <div className="cfm-body">
        <Sidebar
          activeKey={sidebarActiveKey}
          onNavigate={(path) => navigateTo(path)}
          onOpenFavorites={openFavorites}
        />

        <main className="cfm-content" aria-label="File view">
          <IconGrid
            entries={gridEntries}
            favorites={favorites}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            onOpen={handleOpenEntry}
            onToggleFavorite={(entry) => {
              const file = activeFiles.find((item) => item.path === entry.path);
              if (file) toggleFavorite(file);
            }}
          />

          {!loading && isEmpty ? (
            <div className="cfm-empty">Папка пуста.</div>
          ) : null}
        </main>
      </div>

      <StatusBar
        itemsCount={statusCount}
        selectedLabel={selectedLabel}
        error={error}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/mp4"
        className="filemanager-hidden"
        onChange={(event) => handleUpload(event.target.files)}
      />
    </div>
  );
}
