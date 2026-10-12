import { Geologica, Onest } from "next/font/google";

/* Both fonts carry cyrillic-ext and draw the Mongolian Ө and Ү themselves (Unbounded did not). */
export const onest = Onest({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-onest",
  display: "swap",
});

export const geologica = Geologica({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-geologica",
  display: "swap",
});
