import "server-only";
import { makeFixtures } from "@/contracts/fixtures";

export async function getDemoFixtures() {
  const fixtures = makeFixtures();
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
  fixtures.devices = fixtures.devices.map((device) => ({
    ...device,
    status: "online",
    lastSeenAt: new Date().toISOString(),
  }));
  return fixtures;
}
