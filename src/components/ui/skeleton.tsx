import { cn } from "@/lib/cn";

/** Grey shimmering placeholder with the size of the content that is loading. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,rgb(255_255_255/0.04)_0,rgb(255_255_255/0.11)_40%,rgb(255_255_255/0.04)_80%)] bg-[length:480px_100%]",
        className,
      )}
    />
  );
}
