import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoUploadListProps = ComponentPropsWithoutRef<"div">;

export function EcoUploadList({ className, ...props }: EcoUploadListProps) {
  return (
    <div
      {...props}
      className={cx("eco-upload-list", className)}
      data-eco="upload-list"
    />
  );
}
