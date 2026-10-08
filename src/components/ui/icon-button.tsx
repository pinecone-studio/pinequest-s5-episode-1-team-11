import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type IconButtonProps = Omit<ComponentProps<"button">, "aria-label"> & {
  /** Required: what the button does, read by screen readers. */
  label: string;
};

/** Round 44px glass button that holds only an icon. */
export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "glass inline-grid size-11 shrink-0 place-items-center rounded-full text-foreground transition-transform active:scale-95 disabled:opacity-50 [&_svg]:size-5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
