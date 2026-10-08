import type { SVGProps } from "react";

/** Person falling — Phosphor has no fall icon, so this one is drawn in the same 1.6px duotone style. */
export function FallIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <ellipse cx="12" cy="20.5" rx="9" ry="1.6" opacity=".2" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11 21l1-5l-1-4l-3-4h4l3-3M6 16l-1-4l3-4M5 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0m8.5 7H16l4 2"
      />
    </svg>
  );
}
