import { useSyncExternalStore } from "react";

type UploadStatus = "queued" | "uploading" | "done" | "error";

export type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: UploadStatus;
  error?: string;
};

type Listener = () => void;

let uploads: UploadItem[] = [];
const listeners = new Set<Listener>();

export function getUploads() {
  return uploads;
}

export function addUpload(item: UploadItem) {
  uploads = [item, ...uploads];
  listeners.forEach((listener) => listener());
}

export function updateUpload(id: string, patch: Partial<UploadItem>) {
  let changed = false;
  uploads = uploads.map((item) => {
    if (item.id !== id) return item;
    changed = true;
    return { ...item, ...patch };
  });
  if (changed) {
    listeners.forEach((listener) => listener());
  }
}

export function clearUploads() {
  uploads = [];
  listeners.forEach((listener) => listener());
}

export function hasActiveUploads() {
  return uploads.some((item) => item.status === "queued" || item.status === "uploading");
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUploads() {
  return useSyncExternalStore(subscribe, getUploads, getUploads);
}
