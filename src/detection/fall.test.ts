import { describe, expect, it } from "vitest";
import { FallDetector, type FallSignal, fallPreset } from "./fall";
import { poseFeatures } from "./pose";
import { lying, standing, timeline } from "./test-poses";

const elderly = fallPreset({ watching: "elderly", sensitivity: "medium" });
function run(frames: ReturnType<typeof timeline>, preset = elderly) {
  const detector = new FallDetector(preset);
  const signals: FallSignal[] = [];
  for (const frame of frames) {
    const signal = detector.update(frame);
    if (signal) signals.push(signal);
  }
  return signals;
}
const stand = { hold: standing(), ms: 2000 };
const fall = { from: standing(), to: lying(), ms: 600 };

describe("pose features", () => {
  it("measures upright and lying bodies", () => {
    const up = poseFeatures(standing());
    const down = poseFeatures(lying());
    expect(up?.torsoAngle).toBeLessThan(10);
    expect(up?.aspect).toBeLessThan(0.5);
    expect(down?.torsoAngle).toBeGreaterThan(70);
    expect(down?.aspect).toBeGreaterThan(2);
  });
});

describe("fall detector", () => {
  it("alerts once after a fast fall and staying down", () => {
    const signals = run(timeline([stand, fall, { hold: lying(), ms: 5000 }]));
    expect(signals).toHaveLength(1);
    expect(signals[0].onset).toBeGreaterThanOrEqual(1900);
    expect(signals[0].time - signals[0].onset).toBeGreaterThanOrEqual(3000);
    expect(signals[0].time - signals[0].onset).toBeLessThan(4500);
    expect(signals[0].confidence).toBeGreaterThan(0.7);
  });

  it("ignores lying down slowly, sitting down and getting back up", () => {
    expect(
      run(
        timeline([stand, { from: standing(), to: lying(), ms: 4000 }, { hold: lying(), ms: 6000 }]),
      ),
    ).toEqual([]);
    expect(
      run(
        timeline([
          stand,
          { from: standing(), to: standing(0.62), ms: 400 },
          { hold: standing(0.62), ms: 6000 },
        ]),
      ),
    ).toEqual([]);
    expect(
      run(
        timeline([
          stand,
          fall,
          { hold: lying(), ms: 1000 },
          { from: lying(), to: standing(), ms: 600 },
          { hold: standing(), ms: 5000 },
        ]),
      ),
    ).toEqual([]);
  });

  it("waits longer for children and alerts when the body is hidden after a fall", () => {
    const child = fallPreset({ watching: "child", sensitivity: "medium" });
    const childFall = { from: standing(), to: lying(), ms: 450 };
    expect(run(timeline([stand, childFall, { hold: lying(), ms: 4000 }]), child)).toEqual([]);
    expect(run(timeline([stand, childFall, { hold: lying(), ms: 7000 }]), child)).toHaveLength(1);
    const hidden = run(timeline([stand, fall, { hold: null, ms: 5000 }]));
    expect(hidden).toHaveLength(1);
    expect(hidden[0].confidence).toBeLessThan(0.85);
  });

  it("scales thresholds with sensitivity", () => {
    const low = fallPreset({ watching: "elderly", sensitivity: "low" });
    const high = fallPreset({ watching: "elderly", sensitivity: "high" });
    expect(low.minSpeed).toBeGreaterThan(elderly.minSpeed);
    expect(high.downMs).toBeLessThan(elderly.downMs);
  });
});
