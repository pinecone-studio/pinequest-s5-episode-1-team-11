import { cn } from "@/lib/cn";

/** The small Halo orb used as the logo, same as the app sidebar. */
export function HaloMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-8 shrink-0 rounded-full bg-[radial-gradient(circle_at_34%_28%,var(--orb-highlight)_0%,var(--primary)_40%,color-mix(in_srgb,var(--primary)_40%,var(--background))_100%)] shadow-[0_0_18px_-2px_var(--primary)]",
        className,
      )}
    />
  );
}
