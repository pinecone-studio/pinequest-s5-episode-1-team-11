import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-white/6 border-hairline text-muted-foreground [--led:var(--muted-foreground)]",
  ok: "bg-white/6 border-hairline text-muted-foreground [--led:var(--primary)]",
  warning: "bg-warning/14 border-warning/40 text-warning-text [--led:var(--warning)]",
  danger:
    "bg-destructive/20 border-destructive/50 text-destructive-text [--led:var(--destructive)]",
} as const;

export type PillTone = keyof typeof tones;

/** Small status label. Colour is always paired with text, never colour alone. */
export function Pill({
  tone = "neutral",
  dot = true,
  pulse,
  className,
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  /** Blinking dot, only for urgent states. */
  pulse?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-bold",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <i
          aria-hidden="true"
          className={cn(
            "size-[7px] rounded-full bg-[var(--led)] shadow-[0_0_6px_var(--led)]",
            pulse && "animate-blink",
          )}
        />
      )}
      {children}
    </span>
  );
}
