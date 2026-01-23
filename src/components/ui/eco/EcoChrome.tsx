import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoChromeProps = ComponentPropsWithoutRef<"div">;

export function EcoChrome({ className, ...props }: EcoChromeProps) {
  return (
    <div
      {...props}
      className={cx("eco-chrome", className)}
      data-eco="chrome"
    />
  );
}
