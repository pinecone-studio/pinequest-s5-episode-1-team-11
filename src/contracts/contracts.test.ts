import { describe, expect, it } from "vitest";
import { makeFixtures } from "./fixtures";
import {
  Device,
  Event,
  formatPairingCode,
  Household,
  Member,
  PairRequest,
  WatchedPerson,
} from "./index";

describe("fixtures match the contracts", () => {
  const f = makeFixtures(new Date("2026-10-07T06:32:00Z"));
  it("events", () => {
    for (const e of f.events) expect(Event.parse(e)).toEqual(e);
  });
  it("devices", () => {
    for (const d of f.devices) expect(Device.parse(d)).toEqual(d);
  });
  it("household, members, people", () => {
    expect(Household.parse(f.household)).toEqual(f.household);
    for (const m of f.members) expect(Member.parse(m)).toEqual(m);
    for (const p of f.watchedPeople) expect(WatchedPerson.parse(p)).toEqual(p);
  });
  it("events are newest first", () => {
    const times = f.events.map((e) => Date.parse(e.occurredAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});

describe("pairing", () => {
  it("accepts only six digits", () => {
    expect(PairRequest.safeParse({ code: "482917", kind: "phone" }).success).toBe(true);
    expect(PairRequest.safeParse({ code: "48291", kind: "phone" }).success).toBe(false);
    expect(PairRequest.safeParse({ code: "48291a", kind: "phone" }).success).toBe(false);
  });
  it("formats the code in two groups", () => expect(formatPairingCode("482917")).toBe("482 917"));
});
