import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoCardProps = ComponentPropsWithoutRef<"div">;

export function EcoCard({ className, ...props }: EcoCardProps) {
  return (
    <div
      {...props}
      className={cx("eco-card", className)}
      data-eco="card"
    />
  );
}
