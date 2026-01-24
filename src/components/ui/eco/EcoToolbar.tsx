import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoToolbarProps = ComponentPropsWithoutRef<"div">;

export function EcoToolbar({ className, ...props }: EcoToolbarProps) {
  return <div {...props} className={cx("eco-toolbar", className)} data-eco="toolbar" />;
}
