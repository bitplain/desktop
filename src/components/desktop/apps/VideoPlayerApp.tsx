"use client";

import { useEffect, useMemo, useRef } from "react";
import { moveVideoSelection, useCurrentVideo } from "@/lib/videoSelectionStore";
import { attachVideoKeyNavigation } from "./videoKeyNavigation";
import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";
import { EcoCard } from "@/components/ui/eco";

export default function VideoPlayerApp() {
  const selection = useCurrentVideo();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const src = useMemo(() => {
    if (!selection) return "";
    return `/api/filemanager/stream?path=${encodeURIComponent(selection.path)}`;
  }, [selection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    return attachVideoKeyNavigation(window, {
      onNext: () => moveVideoSelection(1),
      onPrevious: () => moveVideoSelection(-1),
      onToggle: () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
          video.play().catch(() => undefined);
          return;
        }
        video.pause();
      },
    });
  }, []);

  useEffect(() => {
    if (!selection) return;
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => undefined);
  }, [selection?.path]);

  return (
    <XpWindow title="Видео">
      <EcoCard>
        <div className="video-player">
          {selection ? (
            <video key={selection.path} ref={videoRef} controls src={src} />
          ) : (
            <div className="muted">Выберите видео в файловом менеджере.</div>
          )}
        </div>
      </EcoCard>
    </XpWindow>
  );
}
