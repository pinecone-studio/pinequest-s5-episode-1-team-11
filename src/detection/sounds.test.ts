import { describe, expect, it } from "vitest";
import {
  groupScores,
  SOUND_HOP_MS,
  SoundDetector,
  type SoundScores,
  type SoundSignal,
  soundPreset,
} from "./sounds";

const quiet: SoundScores = { scream: 0.02, cry: 0.02, glass: 0.01, alarm: 0.01 };
function run(windows: Partial<SoundScores>[], watching: "elderly" | "child" = "elderly") {
  const detector = new SoundDetector(soundPreset({ watching, sensitivity: "medium" }));
  const signals: SoundSignal[] = [];
  windows.forEach((scores, index) => {
    signals.push(...detector.update(index * SOUND_HOP_MS, { ...quiet, ...scores }));
  });
  return signals;
}
const repeat = <T>(value: T, count: number) => Array.from({ length: count }, () => value);

describe("sound detector", () => {
  it("groups classifier categories by kind", () => {
    expect(
      groupScores([
        { categoryName: "Baby cry, infant cry", score: 0.4 },
        { categoryName: "Crying, sobbing", score: 0.6 },
        { categoryName: "Shatter", score: 0.3 },
        { categoryName: "Music", score: 0.9 },
      ]),
    ).toEqual({ scream: 0, cry: 0.6, glass: 0.3, alarm: 0 });
  });

  it("needs repeated screaming unless one window is very loud", () => {
    expect(run([{ scream: 0.4 }, {}, {}, { scream: 0.4 }])).toEqual([]);
    expect(run([{ scream: 0.4 }, { scream: 0.5 }]).map((s) => s.kind)).toEqual(["scream"]);
    expect(run([{ scream: 0.8 }])).toEqual([{ kind: "scream", time: 0, confidence: 0.8 }]);
  });

  it("reports glass at once and alarms after a few seconds", () => {
    expect(run([{ glass: 0.5 }]).map((s) => s.kind)).toEqual(["glass"]);
    expect(run(repeat({ alarm: 0.5 }, 3))).toEqual([]);
    expect(run(repeat({ alarm: 0.5 }, 4)).map((s) => s.kind)).toEqual(["alarm"]);
  });

  it("only reports long crying, and waits longer for children", () => {
    expect(run(repeat({ cry: 0.5 }, 10))).toEqual([]);
    expect(run(repeat({ cry: 0.5 }, 24)).map((s) => s.kind)).toEqual(["cry"]);
    expect(run(repeat({ cry: 0.5 }, 40), "child")).toEqual([]);
    expect(run(repeat({ cry: 0.5 }, 72), "child").map((s) => s.kind)).toEqual(["cry"]);
  });

  it("expires screaming evidence across a gap while accepting fresh repeated scores", () => {
    const detector = new SoundDetector(soundPreset({ watching: "elderly", sensitivity: "medium" }));
    const scream = { ...quiet, scream: 0.4 };

    expect(detector.update(0, scream)).toEqual([]);
    expect(detector.update(60_000, scream)).toEqual([]);
    expect(detector.update(60_000 + SOUND_HOP_MS, scream)).toMatchObject([{ kind: "scream" }]);
  });

  it("expires each kind's evidence at its configured time window", () => {
    const detector = new SoundDetector(soundPreset({ watching: "elderly", sensitivity: "medium" }));
    for (const time of [0, 500, 1000]) {
      expect(detector.update(time, { ...quiet, alarm: 0.5 })).toEqual([]);
    }

    // The first score is now outside the alarm's six 500 ms windows.
    expect(detector.update(3000, { ...quiet, alarm: 0.5 })).toEqual([]);
    expect(detector.update(3500, { ...quiet, alarm: 0.5 })).toEqual([]);
    expect(detector.update(4000, { ...quiet, alarm: 0.5 })).toEqual([]);
    expect(detector.update(4500, { ...quiet, alarm: 0.5 })).toMatchObject([{ kind: "alarm" }]);
  });

  it("requires fresh crying evidence after monitoring is interrupted", () => {
    const detector = new SoundDetector(soundPreset({ watching: "elderly", sensitivity: "medium" }));
    for (let index = 0; index < 23; index++) {
      expect(detector.update(index * SOUND_HOP_MS, { ...quiet, cry: 0.5 })).toEqual([]);
    }

    expect(detector.update(120_000, { ...quiet, cry: 0.5 })).toEqual([]);
    const signals = [];
    for (let index = 1; index < 24; index++) {
      signals.push(...detector.update(120_000 + index * SOUND_HOP_MS, { ...quiet, cry: 0.5 }));
    }
    expect(signals).toMatchObject([{ kind: "cry" }]);
  });
});
