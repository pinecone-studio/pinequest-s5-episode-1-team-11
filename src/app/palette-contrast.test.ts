import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { palettes } from "@/components/theme/palettes";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

/** The hex custom properties declared in the first block for this exact selector. */
function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return {};
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, value]) => [
      name,
      value,
    ]),
  );
}
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const value = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const modes = palettes.flatMap((palette) => [
  {
    name: `${palette} light`,
    tokens: { ...block(":root"), ...block(`[data-palette="${palette}"]`) },
  },
  {
    name: `${palette} dark`,
    tokens: {
      ...block(":root"),
      ...block(".dark"),
      ...block(`[data-palette="${palette}"]`),
      ...block(`.dark[data-palette="${palette}"]`),
    },
  },
]);

describe("palette contrast (WCAG AA)", () => {
  it.each(modes)("keeps every text readable on its surface: $name", ({ tokens }) => {
    const text: [string, string][] = [
      ["foreground", "background"],
      ["card-foreground", "card"],
      ["muted-foreground", "background"],
      ["muted-foreground", "card"],
      ["muted-foreground", "muted"],
      ["primary-text", "background"],
      ["primary-text", "card"],
      ["primary-foreground", "primary"],
      ["warning-text", "card"],
      ["destructive-text", "card"],
      ["warning-foreground", "warning"],
    ];
    for (const [fore, back] of text)
      expect(contrast(tokens[fore], tokens[back]), `${fore} on ${back}`).toBeGreaterThanOrEqual(
        4.5,
      );
    expect(contrast("#ffffff", tokens["destructive-strong"])).toBeGreaterThanOrEqual(4.5);
    // Field borders are non-text UI: 3:1.
    expect(contrast(tokens.input, tokens.card), "input on card").toBeGreaterThanOrEqual(3);
  });
});
