import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoTaskPaneProps = ComponentPropsWithoutRef<"div">;

export function EcoTaskPane({ className, ...props }: EcoTaskPaneProps) {
  return (
    <div
      {...props}
      className={cx("eco-task-pane", className)}
      data-eco="task-pane"
    />
  );
}
