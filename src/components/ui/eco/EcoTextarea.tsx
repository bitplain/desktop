import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoTextareaProps = ComponentPropsWithoutRef<"textarea">;

export function EcoTextarea({ className, ...props }: EcoTextareaProps) {
  return (
    <textarea
      {...props}
      className={cx("eco-textarea", className)}
      data-eco="textarea"
    />
  );
}
