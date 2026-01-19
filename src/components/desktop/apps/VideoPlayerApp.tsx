"use client";

import { useMemo } from "react";
import { useCurrentVideo } from "@/lib/videoSelectionStore";

export default function VideoPlayerApp() {
  const selection = useCurrentVideo();
  const src = useMemo(() => {
    if (!selection) return "";
    return `/api/filemanager/stream?path=${encodeURIComponent(selection.path)}`;
  }, [selection]);

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
