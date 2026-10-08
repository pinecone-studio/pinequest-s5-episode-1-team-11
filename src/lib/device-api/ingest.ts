import type { DetectionSettings, EventIngest } from "@/contracts";

const MAX_SNAPSHOT_BYTES = 1_500_000;
const MAX_REPLAY_MS = 24 * 60 * 60_000;
const MAX_CLOCK_SKEW_MS = 60_000;

/** The guardian's per-camera switches. Cameras check them too; the server is the backstop. */
export function isKindEnabled(kind: EventIngest["kind"], settings: DetectionSettings) {
  if (kind === "fall") return settings.fall;
  if (kind === "scream" || kind === "cry") return settings.distress;
  return settings.hazard;
}

/** Offline cameras replay their outbox later. Future clocks are clamped, day-old events refused. */
export function normalizeOccurredAt(occurredAt: string, now = Date.now()) {
  const time = Date.parse(occurredAt);
  if (Number.isNaN(time) || time < now - MAX_REPLAY_MS) return null;
  return new Date(Math.min(time, now + MAX_CLOCK_SKEW_MS)).toISOString();
}

/** Base64 (optionally a data URL) → JPEG bytes, or null for anything that is not a small JPEG. */
export function decodeSnapshot(value: string) {
  const base64 = value.replace(/^data:image\/jpeg;base64,/, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
  const bytes = Buffer.from(base64, "base64");
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return isJpeg && bytes.length <= MAX_SNAPSHOT_BYTES ? bytes : null;
}
