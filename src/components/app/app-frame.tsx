import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Phone-width column on the aurora background, with room for the tab bar and safe areas. */
export function AppFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh bg-aurora-calm bg-fixed">
      <main
        className={cn(
          "mx-auto grid w-full max-w-lg content-start gap-6 px-5 pt-[max(24px,env(safe-area-inset-top))] pb-32",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}
