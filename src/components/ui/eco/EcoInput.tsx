import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoInputProps = ComponentPropsWithoutRef<"input">;

export function EcoInput({ className, ...props }: EcoInputProps) {
  return (
    <input
      {...props}
      className={cx("eco-input", className)}
      data-eco="input"
    />
  );
}
