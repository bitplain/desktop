import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoPanelProps = ComponentPropsWithoutRef<"div">;

export function EcoPanel({ className, ...props }: EcoPanelProps) {
  return (
    <div
      {...props}
      className={cx("eco-panel", className)}
      data-eco="panel"
    />
  );
}
