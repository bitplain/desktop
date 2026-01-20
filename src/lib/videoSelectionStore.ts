import { useSyncExternalStore } from "react";

type VideoItem = { path: string; name: string };

type Listener = () => void;

let list: VideoItem[] = [];
let index = -1;
const listeners = new Set<Listener>();

export function getCurrentVideo() {
  if (index < 0 || index >= list.length) return null;
  return list[index];
}

export function setVideoSelection(nextList: VideoItem[], currentPath: string) {
  list = nextList;
  index = nextList.findIndex((item) => item.path === currentPath);
  if (index < 0 && nextList.length > 0) {
    index = 0;
  }
  listeners.forEach((listener) => listener());
}

export function moveVideoSelection(delta: number) {
  if (list.length === 0 || index < 0) return;
  const next = Math.min(list.length - 1, Math.max(0, index + delta));
  if (next === index) return;
  index = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCurrentVideo() {
  return useSyncExternalStore(subscribe, getCurrentVideo, getCurrentVideo);
}
