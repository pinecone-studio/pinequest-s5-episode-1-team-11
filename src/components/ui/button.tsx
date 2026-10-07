import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

const variants = {
  primary: "bg-primary text-primary-foreground shadow-[0_14px_34px_-16px_var(--primary)]",
  secondary: "glass text-foreground",
  ghost: "bg-transparent text-foreground hover:bg-hairline",
  destructive:
    "bg-destructive text-destructive-foreground shadow-[0_14px_34px_-14px_var(--destructive)]",
  warning: "bg-warning text-warning-foreground",
} as const;

const sizes = {
  sm: "min-h-10 px-4 text-base gap-1.5 [&_svg]:size-4",
  md: "min-h-[52px] px-6 text-md gap-2 [&_svg]:size-5",
  lg: "min-h-16 px-8 text-lg gap-2 [&_svg]:size-6",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Stretch to the full width of the parent. */
  block?: boolean;
  /** Shows a spinner and blocks clicks while an action is running. */
  loading?: boolean;
  /** Render the child element (e.g. a <Link>) with button styles. */
  asChild?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  block,
  loading,
  asChild,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      type={asChild ? undefined : (props.type ?? "button")}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full font-bold transition-[transform,opacity] duration-150 ease-[var(--ease-standard)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner />}
          {children}
        </>
      )}
    </Comp>
  );
}
