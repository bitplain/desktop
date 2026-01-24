import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoToolbarButtonProps = ComponentPropsWithoutRef<"button">;

export function EcoToolbarButton({ className, ...props }: EcoToolbarButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cx("eco-toolbar-button", className)}
      data-eco="toolbar-button"
    />
  );
}
