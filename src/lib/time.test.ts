import { expect, it } from "vitest";
import { formatTimestamp, relativeTimeParts } from "./time";

it("keeps past/future direction and switches elapsed units at their boundaries", () => {
  const now = new Date("2026-10-07T18:00:00Z");
  expect(relativeTimeParts(new Date("2026-10-07T17:00:01Z"), now)).toEqual({
    key: "past.minute",
    count: 60,
  });
  expect(relativeTimeParts(new Date("2026-10-07T17:00:00Z"), now)).toEqual({
    key: "past.hour",
    count: 1,
  });
  expect(relativeTimeParts(new Date("2026-10-08T18:00:00Z"), now)).toEqual({
    key: "future.day",
    count: 1,
  });
  expect(relativeTimeParts(now, now)).toEqual({ key: "now", count: 0 });
  expect(() => relativeTimeParts(new Date("invalid"), now)).toThrow("Invalid date");
});

it("formats the same numeric timestamp across locale fallbacks and midnight", () => {
  const date = new Date("2026-12-31T16:00:00Z");
  expect(formatTimestamp(date, "Asia/Ulaanbaatar")).toBe("2027-01-01 00:00");
  expect(formatTimestamp(date, "UTC")).toBe("2026-12-31 16:00");
});
