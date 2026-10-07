"use client";

import { Switch as Primitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** On/off toggle, 52×32. Give it an aria-label or put it inside a <label>. */
export function Switch({ className, ...props }: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      className={cn(
        "relative h-8 w-[52px] shrink-0 rounded-full bg-muted transition-colors data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    >
      <Primitive.Thumb className="block size-7 translate-x-0.5 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.35)] transition-transform duration-300 ease-[var(--ease-snappy)] data-[state=checked]:translate-x-[22px]" />
    </Primitive.Root>
  );
}
