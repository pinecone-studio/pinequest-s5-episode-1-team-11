import { describe, expect, it } from "vitest";
import { homeStatus } from "./dashboard";
import type { Device, HaloEvent } from "./types";

const device = (status: Device["status"]) => ({ status }) as Device;
const event = (status: HaloEvent["status"], severity: HaloEvent["severity"]) =>
  ({ status, severity }) as HaloEvent;

describe("home status (same order as the web)", () => {
  it("puts an open critical alert first, then setup, then offline cameras", () => {
    expect(homeStatus([], [event("new", "critical")])).toBe("alert");
    expect(homeStatus([], [])).toBe("empty");
    expect(homeStatus([device("online"), device("offline")], [event("new", "info")])).toBe(
      "offline",
    );
  });
  it("asks for attention only while something is unread", () => {
    expect(homeStatus([device("online")], [event("new", "warning")])).toBe("attention");
    expect(homeStatus([device("online")], [event("acknowledged", "critical")])).toBe("calm");
  });
});
