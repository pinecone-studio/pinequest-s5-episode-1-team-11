import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { getMessages } from "./messages";

/** Collect "a.b.c" paths so mn and en can be compared key by key. */
function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("messages", () => {
  it("every language has exactly the same keys as Mongolian", () => {
    const mn = keys(getMessages("mn")).sort();
    for (const locale of locales) expect(keys(getMessages(locale)).sort()).toEqual(mn);
  });
});
