import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoStatProps = ComponentPropsWithoutRef<"div">;

export function EcoStat({ className, ...props }: EcoStatProps) {
  return (
    <div
      {...props}
      className={cx("eco-stat", className)}
      data-eco="stat"
    />
  );
}
