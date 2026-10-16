import { describe, expect, it } from "vitest";
import { colors } from "../components/colors";

function luminance(hex: string) {
  const values = hex.slice(1).match(/.{2}/g)!.map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("mobile readability", () => {
  it.each([colors.bg, colors.card, colors.surface, colors.primarySoft])(
    "keeps normal and secondary text readable on %s",
    (background) => {
      expect(contrast(colors.text, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.muted, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.primary, background)).toBeGreaterThanOrEqual(4.5);
    },
  );
  it("keeps action labels and status messages readable", () => {
    expect(contrast(colors.onPrimary, colors.primaryButton)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.danger, colors.dangerSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.warning, colors.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onWarning, colors.warningButton)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.inputBorder, colors.card)).toBeGreaterThanOrEqual(3);
  });
});
