"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setCurrentVideo } from "@/lib/videoSelectionStore";

const VIEW_VIDEO = "video";
const VIEW_FAVORITES = "favorites";
const VIEW_ROOT = "root";

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

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

function formatBytes(bytes: number | null) {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function buildPath(base: string, name: string) {
  return [base, name].filter(Boolean).join("/");
}

export default function FileManagerApp({
  onOpenVideo,
}: {
  onOpenVideo: () => void;
}) {
  const [view, setView] = useState(VIEW_VIDEO);
  const [currentPath, setCurrentPath] = useState("video");
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
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

  const openFolder = (folder: FolderEntry) => {
    if (view === VIEW_FAVORITES) return;
    const nextPath = buildPath(listPath, folder.name);
    setCurrentPath(nextPath);
    setView(VIEW_VIDEO);
    setSelectedPath(null);
  };

  const handleDoubleClick = (entry: Entry) => {
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
    setCurrentVideo({ path: normalizedPath, name: entry.name });
    onOpenVideo();
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const parentPath = view === VIEW_ROOT ? "" : listPath;
    try {
      const res = await fetch("/api/filemanager/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPath, name }),
      });
      if (!res.ok) {
        throw new Error("Не удалось создать папку");
      }
      setCreatingFolder(false);
      setNewFolderName("");
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
    const entry: Entry | null = directEntry ?? (fileEntry ? { ...fileEntry, type: "file" } : null);
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
    const parentPath = view === VIEW_ROOT ? "" : listPath;

    Array.from(filesToUpload).forEach((file) => {
      const id = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`;
      const item: UploadItem = {
        id,
        name: file.name,
        progress: 0,
        status: "queued",
      };
      setUploads((prev) => [item, ...prev]);

      const formData = new FormData();
      formData.append("files", file);
      formData.append("path", parentPath);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/filemanager/upload");
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === id ? { ...upload, progress, status: "uploading" } : upload
          )
        );
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploads((prev) =>
            prev.map((upload) =>
              upload.id === id ? { ...upload, progress: 100, status: "done" } : upload
            )
          );
          loadEntries();
          return;
        }
        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === id
              ? { ...upload, status: "error", error: "Ошибка загрузки" }
              : upload
          )
        );
      };
      xhr.onerror = () => {
        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === id
              ? { ...upload, status: "error", error: "Ошибка загрузки" }
              : upload
          )
        );
      };
      xhr.send(formData);
    });
  };

  return (
    <div className="filemanager">
      <aside className="filemanager-sidebar">
        <div className="panel-title">Папки</div>
        <div className="filemanager-links">
          <button
            type="button"
            className={`filemanager-link ${view === VIEW_VIDEO ? "active" : ""}`}
            onClick={() => {
              setView(VIEW_VIDEO);
              setCurrentPath("video");
            }}
          >
            Видео
          </button>
          <button
            type="button"
            className={`filemanager-link ${view === VIEW_FAVORITES ? "active" : ""}`}
            onClick={() => setView(VIEW_FAVORITES)}
          >
            Избранное
          </button>
          <button
            type="button"
            className={`filemanager-link ${view === VIEW_ROOT ? "active" : ""}`}
            onClick={() => {
              setView(VIEW_ROOT);
              setCurrentPath("");
            }}
          >
            Корень
          </button>
        </div>
        <div className="filemanager-actions">
          <button
            type="button"
            className="xp-button"
            onClick={() => setCreatingFolder((prev) => !prev)}
          >
            Создать папку
          </button>
          <button
            type="button"
            className="xp-button secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Загрузить
          </button>
          <button
            type="button"
            className="xp-button secondary"
            disabled={!selectedPath}
            onClick={handleDelete}
          >
            Удалить
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/mp4"
            className="filemanager-hidden"
            onChange={(event) => handleUpload(event.target.files)}
          />
        </div>
        {creatingFolder ? (
          <div className="filemanager-new-folder">
            <input
              className="xp-input"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Имя папки"
            />
            <div className="filemanager-new-folder-actions">
              <button type="button" className="xp-button" onClick={handleCreateFolder}>
                Создать
              </button>
              <button
                type="button"
                className="xp-button secondary"
                onClick={() => {
                  setCreatingFolder(false);
                  setNewFolderName("");
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : null}
      </aside>

      <section className="filemanager-content">
        <div className="filemanager-header">
          <div>
            <div className="panel-title">{view === VIEW_FAVORITES ? "Избранное" : listPath}</div>
            <div className="muted">{loading ? "Загрузка..." : "Готово"}</div>
          </div>
        </div>

        {error ? <div className="filemanager-alert">{error}</div> : null}

        <div className="filemanager-list">
          {view !== VIEW_FAVORITES
            ? folders.map((folder) => (
                <div
                  key={folder.path}
                  role="button"
                  tabIndex={0}
                  className={`filemanager-row ${selectedPath === folder.path ? "selected" : ""}`}
                  onClick={() => setSelectedPath(folder.path)}
                  onDoubleClick={() => openFolder(folder)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openFolder(folder);
                    }
                  }}
                >
                  <span className="filemanager-icon folder" aria-hidden />
                  <span className="filemanager-name">{folder.name}</span>
                  <span className="filemanager-size">Папка</span>
                  <span className="filemanager-date">{formatDate(folder.updatedAt)}</span>
                  <span />
                </div>
              ))
            : null}

          {activeFiles.map((file) => (
            <div
              key={file.path}
              role="button"
              tabIndex={0}
              className={`filemanager-row ${selectedPath === file.path ? "selected" : ""}`}
              onClick={() => setSelectedPath(file.path)}
              onDoubleClick={() => handleDoubleClick({ ...file, type: "file" })}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleDoubleClick({ ...file, type: "file" });
                }
              }}
            >
              <span className="filemanager-icon video" aria-hidden />
              <span className="filemanager-name">{file.name}</span>
              <span className="filemanager-size">{formatBytes(file.size)}</span>
              <span className="filemanager-date">{formatDate(file.updatedAt)}</span>
              <button
                type="button"
                className={`filemanager-favorite ${favorites.has(file.path) ? "active" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavorite(file);
                }}
                aria-label={
                  favorites.has(file.path) ? "Удалить из избранного" : "Добавить в избранное"
                }
              />
            </div>
          ))}

          {!loading &&
          (view === VIEW_FAVORITES ? favoritesList.length === 0 : entries.length === 0) ? (
            <div className="muted">Папка пуста.</div>
          ) : null}
        </div>

        {uploads.length > 0 ? (
          <div className="filemanager-upload">
            <div className="panel-title">Загрузки</div>
            <div className="filemanager-upload-list">
              {uploads.map((upload) => (
                <div key={upload.id} className={`filemanager-upload-item ${upload.status}`}>
                  <div className="filemanager-upload-name">{upload.name}</div>
                  <div className="filemanager-progress">
                    <div
                      className="filemanager-progress-bar"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                  <div className="filemanager-upload-status">
                    {upload.status === "error" ? upload.error : `${upload.progress}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
