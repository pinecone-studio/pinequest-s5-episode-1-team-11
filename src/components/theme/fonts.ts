import { Onest, Unbounded } from "next/font/google";

/* Both fonts carry cyrillic-ext, which holds the Mongolian Ө and Ү. */
export const onest = Onest({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-onest",
  display: "swap",
});

export const unbounded = Unbounded({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-unbounded",
  display: "swap",
});
