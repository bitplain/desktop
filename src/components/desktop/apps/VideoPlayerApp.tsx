"use client";

import { useEffect, useMemo } from "react";
import { moveVideoSelection, useCurrentVideo } from "@/lib/videoSelectionStore";
import { attachVideoKeyNavigation } from "./videoKeyNavigation";

export default function VideoPlayerApp() {
  const selection = useCurrentVideo();
  const src = useMemo(() => {
    if (!selection) return "";
    return `/api/filemanager/stream?path=${encodeURIComponent(selection.path)}`;
  }, [selection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    return attachVideoKeyNavigation(window, {
      onNext: () => moveVideoSelection(1),
      onPrevious: () => moveVideoSelection(-1),
    });
  }, []);

  return (
    <div className="video-player">
      {selection ? (
        <video key={selection.path} controls src={src} />
      ) : (
        <div className="muted">Выберите видео в файловом менеджере.</div>
      )}
    </div>
  );
}
