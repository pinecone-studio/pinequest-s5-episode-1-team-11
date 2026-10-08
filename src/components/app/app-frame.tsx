import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Page column on the aurora background.
 * wide (app screens): phone column → tablet 2xl → desktop 6xl with room for the sidebar.
 * narrow (sign-in, forms): one centred column on every screen.
 */
export function AppFrame({
  children,
  className,
  width = "wide",
  sidebar,
}: {
  children: ReactNode;
  className?: string;
  width?: "wide" | "narrow";
  /** Leave room for the desktop SideNav. */
  sidebar?: boolean;
}) {
  return (
    <div className={cn("min-h-dvh bg-aurora-calm bg-fixed", sidebar && "lg:pl-64")}>
      <main
        className={cn(
          "mx-auto grid w-full content-start gap-6 px-5 pt-[max(24px,env(safe-area-inset-top))]",
          width === "wide"
            ? "max-w-lg pb-32 md:max-w-2xl md:px-8 lg:max-w-6xl lg:gap-8 lg:px-10 lg:pt-10 lg:pb-16"
            : "max-w-md pb-16 md:min-h-dvh md:content-center",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}
