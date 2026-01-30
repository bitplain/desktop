import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoAppTitlebarProps = ComponentPropsWithoutRef<"div">;

export function EcoAppTitlebar({ className, ...props }: EcoAppTitlebarProps) {
  return (
    <div
      {...props}
      className={cx("eco-app-titlebar", className)}
      data-eco="app-titlebar"
    />
  );
}
