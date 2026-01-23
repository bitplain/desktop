import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoFileGridProps = ComponentPropsWithoutRef<"div">;

export function EcoFileGrid({ className, ...props }: EcoFileGridProps) {
  return (
    <div
      {...props}
      className={cx("eco-file-grid", className)}
      data-eco="file-grid"
    />
  );
}
