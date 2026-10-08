import { describe, expect, it } from "vitest";
import { safeNext } from "./redirect";

describe("login redirects", () => {
  it("preserves internal paths and query parameters", () => {
    expect(safeNext("/invite/abc?source=link")).toBe("/invite/abc?source=link");
  });
  it("rejects external origins, backslashes and control characters", () => {
    for (const value of [
      null,
      "https://example.com",
      "//example.com",
      "/\\example.com",
      "/\n/example.com",
      "/ /example.com",
    ]) {
      expect(safeNext(value)).toBe("/home");
    }
  });
});
