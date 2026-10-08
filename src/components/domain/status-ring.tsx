import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type RingState = "calm" | "warning" | "alert" | "empty";

const color: Record<RingState, string> = {
  calm: "[--st:var(--primary)]",
  warning: "[--st:var(--warning)]",
  alert: "[--st:var(--destructive)]",
  empty: "[--st:var(--muted-foreground)]",
};
const ink: Record<RingState, string> = {
  calm: "text-primary-foreground",
  warning: "text-warning-foreground",
  alert: "text-white",
  empty: "text-muted-foreground",
};

/**
 * The glowing orb on Home. Calm breathes slowly, alert beats like a heart.
 * Decorative: say the same thing in the heading next to it.
 */
export function StatusRing({
  state,
  children,
  className,
}: {
  state: RingState;
  /** Centre content, e.g. <b>03</b><span>өрөө</span>. */
  children?: ReactNode;
  className?: string;
}) {
  const alert = state === "alert";
  return (
    <div
      aria-hidden="true"
      className={cn("relative grid size-[196px] place-items-center", color[state], className)}
    >
      {state !== "empty" && (
        <span
          className={cn(
            "absolute inset-1.5 rounded-full border-[1.5px] border-[var(--st)] opacity-0",
            alert ? "animate-sonar-fast" : "animate-sonar",
          )}
        />
      )}
      <span
        className={cn(
          "absolute inset-[34px] rounded-full",
          state === "empty"
            ? "border-[1.5px] border-dashed border-foreground/30"
            : "bg-[radial-gradient(circle_at_34%_28%,var(--orb-highlight)_0%,var(--st)_24%,color-mix(in_srgb,var(--st)_55%,var(--background))_72%,color-mix(in_srgb,var(--st)_22%,var(--background))_100%)] shadow-[0_0_70px_-6px_var(--st)]",
          state !== "empty" && (alert ? "animate-heartbeat" : "animate-breathe"),
        )}
      />
      <span
        className={cn(
          "relative grid justify-items-center gap-0.5 [&_b]:font-display [&_b]:text-3xl [&_b]:tabular-nums [&_span]:text-sm [&_span]:font-bold",
          ink[state],
        )}
      >
        {children}
      </span>
    </div>
  );
}
