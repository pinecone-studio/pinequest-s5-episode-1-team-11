"use server";

import { cookies } from "next/headers";
import { isPalette, PALETTE_COOKIE } from "./palettes";

/** Save the colour palette. The root layout reads it, so call router.refresh() afterwards. */
export async function setPalette(palette: string) {
  if (!isPalette(palette)) return;
  (await cookies()).set(PALETTE_COOKIE, palette, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
