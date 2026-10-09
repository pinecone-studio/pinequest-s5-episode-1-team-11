import { describe, expect, it } from "vitest";
import { makeFixtures } from "@/contracts/fixtures";
import { homeStatus } from "./status";

describe("home safety summary", () => {
  const { devices, events } = makeFixtures();
  it("keeps an unseen critical event prominent even after its camera is removed", () => {
    expect(homeStatus([], events[0], 1)).toBe("alert");
  });
  it("guides the first camera setup instead of promising monitoring", () => {
    expect(homeStatus([], null, 0)).toBe("empty");
  });
  it("shows disconnected cameras before the calm state", () => {
    expect(homeStatus(devices, null, 0)).toBe("offline");
  });
  it("distinguishes connected cameras with unread alerts from calm", () => {
    const online = devices.map((device) => ({ ...device, status: "online" as const }));
    expect(homeStatus(online, null, 2)).toBe("attention");
    expect(homeStatus(online, null, 0)).toBe("calm");
  });
});
