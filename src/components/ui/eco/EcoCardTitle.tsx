import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoCardTitleProps = ComponentPropsWithoutRef<"div">;

export function EcoCardTitle({ className, ...props }: EcoCardTitleProps) {
  return (
    <div
      {...props}
      className={cx("eco-card-title", className)}
      data-eco="card-title"
    />
  );
}
