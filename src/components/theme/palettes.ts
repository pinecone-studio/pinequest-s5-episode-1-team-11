export const palettes = ["lake", "night", "hearth", "slate"] as const;
export type Palette = (typeof palettes)[number];
export const defaultPalette: Palette = "lake";
export const PALETTE_COOKIE = "palette";

export function isPalette(value: unknown): value is Palette {
  return typeof value === "string" && (palettes as readonly string[]).includes(value);
}

/** Swatch colours for the picker: [background, accent] in dark mode. */
export const paletteSwatches: Record<Palette, [string, string]> = {
  lake: ["#08181C", "#2DD4BF"],
  night: ["#0A1226", "#60A5FA"],
  hearth: ["#16130F", "#86D7A0"],
  slate: ["#0F172A", "#22C55E"],
};
