import type { ComponentPropsWithoutRef } from "react";
import { cx } from "./classNames";

type EcoNoticeProps = ComponentPropsWithoutRef<"div">;

export function EcoNotice({ className, ...props }: EcoNoticeProps) {
  return (
    <div
      {...props}
      className={cx("notice eco-notice", className)}
      data-eco="notice"
    />
  );
}
