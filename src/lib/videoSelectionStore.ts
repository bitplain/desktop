import { useSyncExternalStore } from "react";

type VideoSelection = { path: string; name: string } | null;

type Listener = () => void;

let current: VideoSelection = null;
const listeners = new Set<Listener>();

export function getCurrentVideo() {
  return current;
}

export function setCurrentVideo(next: VideoSelection) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCurrentVideo() {
  return useSyncExternalStore(subscribe, getCurrentVideo, getCurrentVideo);
}
