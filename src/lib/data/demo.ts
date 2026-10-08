import "server-only";
import { cookies } from "next/headers";
import { makeFixtures } from "@/contracts/fixtures";

export const DEMO_COOKIE = "halo-demo-state";
export const demoStates = ["calm", "alert", "offline", "empty"] as const;
export type DemoState = (typeof demoStates)[number];

export async function getDemoFixtures() {
  const state = (await cookies()).get(DEMO_COOKIE)?.value ?? "calm";
  const fixtures = makeFixtures();
  if (state === "empty") return { ...fixtures, devices: [], events: [], watchedPeople: [] };
  if (state !== "alert") {
    fixtures.events = fixtures.events.map((event) =>
      event.status === "new"
        ? {
            ...event,
            status: "acknowledged",
            acknowledgedBy: fixtures.profile.name,
            acknowledgedAt: new Date().toISOString(),
          }
        : event,
    );
  }
  if (state !== "offline")
    fixtures.devices = fixtures.devices.map((device) => ({ ...device, status: "online" }));
  return fixtures;
}
