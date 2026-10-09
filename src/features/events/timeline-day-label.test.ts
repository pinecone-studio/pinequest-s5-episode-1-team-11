import { createTranslator } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatTimestamp } from "@/lib/time";
import en from "./messages/en.json";
import mn from "./messages/mn.json";
import { timelineDayLabel } from "./timeline-day-label";

afterEach(() => vi.restoreAllMocks());

function translate(locale: "mn" | "en") {
  return createTranslator({
    locale,
    messages: { events: locale === "mn" ? mn : en },
    namespace: "events",
  });
}

describe("timeline day headings across server and browser locale support", () => {
  it.each([
    ["mn", "2026 оны аравдугаар сарын 6"],
    ["en", "October 6, 2026"],
  ] as const)(
    "keeps %s older-date text when the browser falls back to English",
    (locale, expected) => {
      const t = translate(locale);
      expect(timelineDayLabel("2026-10-06", "2026-10-08", t)).toBe(expected);
      const NativeDateTimeFormat = Intl.DateTimeFormat;
      vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
        (requested, options) =>
          new NativeDateTimeFormat(requested === "mn" ? "en" : requested, options),
      );
      expect(timelineDayLabel("2026-10-06", "2026-10-08", t)).toBe(expected);
    },
  );

  it("does not require a localized native date formatter to render an older date", () => {
    const t = translate("mn");
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("Localized date formatting unavailable");
    });
    expect(timelineDayLabel("2026-10-06", "2026-10-08", t)).toBe("2026 оны аравдугаар сарын 6");
  });

  it.each([
    ["mn", "Өнөөдөр", "Өчигдөр", "2026 оны арван хоёрдугаар сарын 30"],
    ["en", "Today", "Yesterday", "December 30, 2026"],
  ] as const)(
    "uses the household day at midnight and the previous year in %s",
    (locale, todayLabel, yesterdayLabel, olderLabel) => {
      const today = formatTimestamp(new Date("2026-12-31T16:00:00Z"), "Asia/Ulaanbaatar").slice(
        0,
        10,
      );
      const t = translate(locale);
      expect(today).toBe("2027-01-01");
      expect(timelineDayLabel("2027-01-01", today, t)).toBe(todayLabel);
      expect(timelineDayLabel("2026-12-31", today, t)).toBe(yesterdayLabel);
      expect(timelineDayLabel("2026-12-30", today, t)).toBe(olderLabel);
    },
  );
});
