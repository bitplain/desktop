import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoFormProps = ComponentPropsWithoutRef<"form">;

export function EcoForm({ className, ...props }: EcoFormProps) {
  return (
    <form
      {...props}
      className={cx("eco-form", className)}
      data-eco="form"
    />
  );
}
