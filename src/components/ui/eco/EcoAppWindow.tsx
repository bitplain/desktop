import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoAppWindowProps = ComponentPropsWithoutRef<"div">;

export function EcoAppWindow({ className, ...props }: EcoAppWindowProps) {
  return (
    <div
      {...props}
      className={cx("eco-app-window", className)}
      data-eco="app-window"
    />
  );
}
