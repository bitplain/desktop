import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoMenuProps = ComponentPropsWithoutRef<"div">;

export function EcoMenu({ className, ...props }: EcoMenuProps) {
  return <div {...props} className={cx("eco-menu", className)} data-eco="menu" />;
}
