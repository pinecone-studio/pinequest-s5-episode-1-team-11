"use client";

import { useSyncExternalStore } from "react";

/** True while the CSS media query matches. Always false during server rendering. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

/** Same breakpoint as Tailwind's lg: — sidebar layout, side sheets. */
export const DESKTOP = "(min-width: 1024px)";
