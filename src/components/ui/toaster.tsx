"use client";

import { Toaster as Sonner } from "sonner";

/** Mounted once in the root layout. Show messages with toast("…") from "sonner". */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={12}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-[26px] !border !border-glass-border !bg-card !text-foreground !font-sans !font-bold !text-base",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}

export { toast } from "sonner";
