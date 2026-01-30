import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoMenuItemProps = ComponentPropsWithoutRef<"button">;

export function EcoMenuItem({ className, ...props }: EcoMenuItemProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cx("eco-menu-item", className)}
      data-eco="menu-item"
    />
  );
}
