import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary";
};

export function EcoButton({ className, variant, ...props }: EcoButtonProps) {
  return (
    <button
      {...props}
      className={cx("eco-button", variant === "secondary" && "secondary", className)}
      data-eco="button"
    />
  );
}
