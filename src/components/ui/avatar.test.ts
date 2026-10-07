import { describe, expect, it } from "vitest";
import { initials } from "./avatar";

describe("initials", () => {
  it("takes the first letters of two words", () => expect(initials("Дулмаа эмээ")).toBe("ДЭ"));
  it("takes two letters of a single name", () => expect(initials("Тэмүүлэн")).toBe("ТЭ"));
  it("handles empty names", () => expect(initials("  ")).toBe("?"));
});
