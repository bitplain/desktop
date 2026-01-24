"use client";

import { useEffect, useMemo } from "react";
import {
  clearUploads,
  hasActiveUploads,
  type UploadItem,
  useUploads,
} from "@/lib/uploadStore";
import { XpWindow } from "@/components/desktop/apps/shared/XpWindow";
import { EcoCard, EcoCardTitle, EcoUploadList } from "@/components/ui/eco";

type UploadManagerAppProps = {
  onClose?: () => void;
};

export function UploadManagerLayout({ uploads }: { uploads: UploadItem[] }) {
  return (
    <EcoCard className="upload-manager">
      <EcoCardTitle>Загрузки</EcoCardTitle>
      <EcoUploadList className="upload-manager-list">
        {uploads.map((upload) => (
          <div key={upload.id} className={`upload-manager-item ${upload.status}`}>
            <div className="upload-manager-name">{upload.name}</div>
            <div className="upload-manager-progress">
              <div
                className="upload-manager-progress-bar"
                style={{ width: `${upload.progress}%` }}
              />
            </div>
            <div className="upload-manager-status">
              {upload.status === "error" ? upload.error : `${upload.progress}%`}
            </div>
          </div>
        ))}
      </EcoUploadList>
    </EcoCard>
  );
}

export default function UploadManagerApp({ onClose }: UploadManagerAppProps) {
  const uploads = useUploads();
  const hasUploads = uploads.length > 0;

  useEffect(() => {
    if (!hasUploads) {
      onClose?.();
      return;
    }
    if (!hasActiveUploads()) {
      clearUploads();
      onClose?.();
    }
  }, [hasUploads, uploads, onClose]);

  const sortedUploads = useMemo(() => uploads, [uploads]);

  return (
    <XpWindow title="Загрузки">
      <UploadManagerLayout uploads={sortedUploads} />
    </XpWindow>
  );
}
