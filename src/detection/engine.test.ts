import { describe, expect, it } from "vitest";
import { defaultDetectionSettings } from "@/contracts";
import { type Detection, DetectionEngine } from "./engine";
import type { SoundScores } from "./sounds";
import { lying, standing, timeline } from "./test-poses";

const quiet: SoundScores = { scream: 0, cry: 0, glass: 0, alarm: 0 };
const fallFrames = (start: number) =>
  timeline([
    { hold: standing(), ms: 2000 },
    { from: standing(), to: lying(), ms: 600 },
    { hold: lying(), ms: 5000 },
  ]).map((frame) => ({ ...frame, time: frame.time + start }));
function falls(engine: DetectionEngine, start = 0) {
  return fallFrames(start).flatMap((frame) => engine.pose(frame));
}

describe("detection engine", () => {
  it("reports a fall at its onset with a snapshot request", () => {
    const [fall] = falls(new DetectionEngine(defaultDetectionSettings));
    expect(fall).toMatchObject({ kind: "fall", wantsSnapshot: true });
    expect(fall.time).toBeGreaterThanOrEqual(1900);
    expect(fall.time).toBeLessThan(2700);
  });

  it("respects the guardian's switches and per-kind cooldowns", () => {
    const engine = new DetectionEngine({ ...defaultDetectionSettings, fall: false });
    expect(falls(engine)).toEqual([]);
    const glass = (time: number) => engine.sound(time, { ...quiet, glass: 0.9 });
    expect(glass(0)).toHaveLength(1);
    expect(glass(30_000)).toEqual([]);
    expect(glass(61_000)).toMatchObject([{ kind: "glass", wantsSnapshot: false }]);
    engine.configure({ ...defaultDetectionSettings, hazard: false });
    expect(glass(200_000)).toEqual([]);
  });

  it("raises fall confidence after a scream", () => {
    const plain = falls(new DetectionEngine(defaultDetectionSettings))[0];
    const engine = new DetectionEngine(defaultDetectionSettings);
    const screams: Detection[] = engine.sound(1500, { ...quiet, scream: 0.9 });
    expect(screams.map((s) => s.kind)).toEqual(["scream"]);
    const boosted = falls(engine)[0];
    expect(boosted.confidence).toBeCloseTo(Math.min(0.99, plain.confidence + 0.1), 5);
    expect(boosted.confidence).toBeGreaterThan(plain.confidence);
  });
});
