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
function run(windows: Partial<SoundScores>[]) {
  const detector = new SoundDetector(soundPreset());
  const signals: SoundSignal[] = [];
  windows.forEach((scores, index) => {
    signals.push(...detector.update(index * SOUND_HOP_MS, { ...quiet, ...scores }));
  });
  return signals;
}
const repeat = <T>(value: T, count: number) => Array.from({ length: count }, () => value);

// Exact production AudioWorklet -> YAMNet -> onScores trace for Freesound 127005.
// Captured browser timestamps include scheduling jitter and a different window phase.
const streamedAdultCry = {
  times: [
    974, 1472, 1972, 2472, 2973, 3473, 3972, 4472, 4972, 5472, 5972, 6472, 6973, 7472, 7973, 8472,
    8972, 9473, 9972, 10474, 10972, 11472, 11972, 12472, 12972, 13472, 13972, 14472, 14972, 15473,
    15972, 16472, 16972, 17472, 17972, 18476, 18972, 19472, 19971, 20473, 20972, 21473, 21974,
    22472, 22972, 23473, 23972, 24472, 24972, 25472, 25972, 26472, 26972, 27472, 27972, 28472,
    28972, 29472, 29972, 30470, 30970, 31471, 31970, 32470, 32971, 33470, 33970, 34470, 34970,
    35471, 35970, 36470, 36970, 37471, 37970, 38470, 38970, 39470, 39970, 40470, 40971, 41471,
    41970, 42471, 42969, 43470, 43970, 44470, 44970,
  ],
  numerator: [
    51, 106, 4, 0, 0, 0, 67, 67, 3, 0, 21, 51, 38, 28, 28, 21, 38, 5, 1, 0, 0, 4, 0, 85, 189, 171,
    15, 0, 28, 38, 8, 0, 0, 1, 28, 11, 5, 11, 11, 5, 0, 0, 0, 5, 0, 3, 0, 1, 15, 106, 85, 15, 0, 0,
    4, 4, 38, 21, 51, 21, 4, 11, 1, 1, 3, 1, 0, 2, 1, 15, 38, 15, 67, 67, 28, 0, 38, 51, 15, 5, 3,
    5, 106, 51, 51, 51, 51, 8, 0,
  ],
};

function replayStream() {
  const detector = new SoundDetector(soundPreset());
  return streamedAdultCry.numerator.flatMap((value, index) =>
    detector.update(streamedAdultCry.times[index], { ...quiet, cry: value / 256 }),
  );
}

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

  it("includes human whimpering without treating dog whimpers or other vocal sounds as crying", () => {
    expect(groupScores([{ categoryName: "Whimper", score: 0.6 }]).cry).toBe(0.6);
    const excluded = [
      "Whimper (dog)",
      "Dog",
      "Howl",
      "Laughter",
      "Giggle",
      "Chuckle, chortle",
      "Cough",
      "Breathing",
      "Speech",
      "Siren",
      "Shout",
      "Children shouting",
    ];
    const scores = groupScores(excluded.map((categoryName) => ({ categoryName, score: 0.99 })));
    expect(scores.cry).toBe(0);
    expect(run(repeat(scores, 240)).filter(({ kind }) => kind === "cry")).toEqual([]);
  });

  it("counts yelling and shouting as screaming, and generic alarms as alarms", () => {
    expect(groupScores([{ categoryName: "Yell", score: 0.5 }]).scream).toBe(0.5);
    expect(groupScores([{ categoryName: "Shout", score: 0.4 }]).scream).toBe(0.4);
    expect(groupScores([{ categoryName: "Alarm clock", score: 0.8 }]).alarm).toBe(0.8);
    expect(groupScores([{ categoryName: "Siren", score: 0.9 }]).alarm).toBe(0);
  });

  it("needs repeated screaming unless one window is very loud", () => {
    expect(run([{ scream: 0.4 }, {}, {}, { scream: 0.4 }])).toEqual([]);
    expect(run([{ scream: 0.4 }, { scream: 0.5 }]).map((s) => s.kind)).toEqual(["scream"]);
    expect(run([{ scream: 0.8 }])).toEqual([{ kind: "scream", time: 0, confidence: 0.8 }]);
  });

  it("reports glass at once and alarms after a few seconds", () => {
    expect(run([{ glass: 0.5 }]).map((s) => s.kind)).toEqual(["glass"]);
    expect(run(repeat({ alarm: 0.5 }, 2))).toEqual([]);
    expect(run(repeat({ alarm: 0.5 }, 3)).map((s) => s.kind)).toEqual(["alarm"]);
  });

  it("reports crying from one clear window or two faint ones", () => {
    expect(run([{ cry: 0.08 }])).toEqual([]);
    expect(run(repeat({ cry: 0.06 }, 2)).map((s) => s.kind)).toEqual(["cry"]);
    expect(run([{ cry: 0.13 }]).map((s) => s.kind)).toEqual(["cry"]);
  });

  it("ignores scattered faint moments of crying-like sound", () => {
    const scattered = repeat({ cry: 0.01 }, 40);
    for (const index of [0, 8, 16, 24, 32]) scattered[index] = { cry: 0.1 };
    expect(run(scattered)).toEqual([]);
  });

  it.each([
    {
      source: "bulbastre adult sobbing (Freesound 127005)",
      numerator: [51, 67, 2, 0, 0, 0, 67, 67, 1, 0],
    },
    {
      source: "scottemoil adult sobbing (Freesound 263776)",
      numerator: [21, 51, 38, 15, 67, 4, 0, 4, 38, 3],
    },
  ])("reports measured $source within seconds", ({ numerator }) => {
    // YAMNet .975 s / 500 ms traces from creator-recorded fixtures; raw scores × 256.
    // https://freesound.org/people/bulbastre/sounds/127005/ (CC BY 4.0)
    // https://freesound.org/people/scottemoil/sounds/263776/ (CC0)
    const detector = new SoundDetector(soundPreset());
    const first = numerator
      .flatMap((value, index) =>
        detector.update(975 + index * SOUND_HOP_MS, { ...quiet, cry: value / 256 }),
      )
      .find(({ kind }) => kind === "cry");
    expect(first?.time).toBeLessThan(3000);
  });

  it("reports the phase-shifted production stream within seconds", () => {
    expect(streamedAdultCry.times).toHaveLength(streamedAdultCry.numerator.length);
    const first = replayStream().find(({ kind }) => kind === "cry");
    expect(first?.time).toBeLessThan(5000);
  });

  it.each([
    { label: "laughter", file: "1-1791-A-26.wav", numerator: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "coughing", file: "1-19111-A-24.wav", numerator: [1, 1, 0, 0, 0, 0, 0, 0, 0] },
    { label: "dog", file: "1-100032-A-0.wav", numerator: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "siren", file: "1-31482-A-42.wav", numerator: [1, 1, 0, 0, 1, 0, 0, 0, 0] },
    { label: "breathing", file: "1-18631-A-23.wav", numerator: [2, 5, 5, 3, 1, 1, 8, 5, 21] },
    { label: "snoring", file: "1-20545-A-28.wav", numerator: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "rain", file: "1-17367-A-10.wav", numerator: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "footsteps", file: "1-155858-A-25.wav", numerator: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "speech", file: "speech-voices.wav", numerator: [0, 0, 0, 0, 0] },
  ])("does not accumulate measured $label ($file) scores into crying", ({ numerator }) => {
    const detector = new SoundDetector(soundPreset());
    const signals = Array.from({ length: 150 }, (_, index) =>
      detector.update(975 + index * SOUND_HOP_MS, {
        ...quiet,
        cry: numerator[index % numerator.length] / 256,
      }),
    ).flat();
    expect(signals.filter(({ kind }) => kind === "cry")).toEqual([]);
  });

  it("expires screaming evidence across a gap while accepting fresh repeated scores", () => {
    const detector = new SoundDetector(soundPreset());
    const scream = { ...quiet, scream: 0.4 };

    expect(detector.update(0, scream)).toEqual([]);
    expect(detector.update(60_000, scream)).toEqual([]);
    expect(detector.update(60_000 + SOUND_HOP_MS, scream)).toMatchObject([{ kind: "scream" }]);
  });

  it("expires each kind's evidence at its configured time window", () => {
    const detector = new SoundDetector(soundPreset());
    for (const time of [0, 500]) {
      expect(detector.update(time, { ...quiet, alarm: 0.5 })).toEqual([]);
    }

    // The first scores are now outside the alarm's four 500 ms windows.
    expect(detector.update(3000, { ...quiet, alarm: 0.5 })).toEqual([]);
    expect(detector.update(3500, { ...quiet, alarm: 0.5 })).toEqual([]);
    expect(detector.update(4000, { ...quiet, alarm: 0.5 })).toMatchObject([{ kind: "alarm" }]);
  });

  it("requires fresh crying evidence after monitoring is interrupted", () => {
    const detector = new SoundDetector(soundPreset());
    expect(detector.update(0, { ...quiet, cry: 0.1 })).toEqual([]);
    expect(detector.update(120_000, { ...quiet, cry: 0.1 })).toEqual([]);
    expect(detector.update(120_500, { ...quiet, cry: 0.1 })).toMatchObject([{ kind: "cry" }]);
  });
});
