import { describe, expect, it } from "vitest";
import { FallDetector, type FallSignal, fallPreset } from "./fall";
import { poseFeatures } from "./pose";
import { crouching, depthCollapsed, leaning, lying, standing, timeline } from "./test-poses";

function run(frames: ReturnType<typeof timeline>, preset = fallPreset()) {
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
    expect(signals[0].time - signals[0].onset).toBeGreaterThanOrEqual(1000);
    expect(signals[0].time - signals[0].onset).toBeLessThan(2500);
    expect(signals[0].confidence).toBeGreaterThan(0.7);
  });

  it("reports lying down even slowly, and ignores sitting down and getting back up", () => {
    // Lying on the floor for a few seconds is reported however the person got there.
    expect(
      run(
        timeline([stand, { from: standing(), to: lying(), ms: 4000 }, { hold: lying(), ms: 6000 }]),
      ),
    ).toHaveLength(1);
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
          { hold: lying(), ms: 300 },
          { from: lying(), to: standing(), ms: 600 },
          { hold: standing(), ms: 5000 },
        ]),
      ),
    ).toEqual([]);
  });

  it("alerts when the body is hidden after a fall", () => {
    const hidden = run(timeline([stand, fall, { hold: null, ms: 5000 }]));
    expect(hidden).toHaveLength(1);
    expect(hidden[0].confidence).toBeLessThan(0.85);
  });

  it("detects a fast collapse with a short hip drop and a strong posture change", () => {
    const down = lying(0.6);
    expect(
      run(timeline([stand, { from: standing(), to: down, ms: 450 }, { hold: down, ms: 5000 }])),
    ).toHaveLength(1);
    // A slow descent is no fall, but staying on the floor still reports once.
    expect(
      run(timeline([stand, { from: standing(), to: down, ms: 3000 }, { hold: down, ms: 200 }])),
    ).toEqual([]);
    expect(
      run(timeline([stand, { from: standing(), to: down, ms: 3000 }, { hold: down, ms: 5000 }])),
    ).toHaveLength(1);
    expect(
      run(
        timeline([
          stand,
          { from: standing(), to: standing(0.6), ms: 450 },
          { hold: standing(0.6), ms: 5000 },
        ]),
      ),
    ).toEqual([]);
  });

  it("does not alert while a person is visibly getting up before the waiting time ends", () => {
    expect(
      run(timeline([stand, fall, { hold: lying(), ms: 700 }, { hold: standing(), ms: 2000 }])),
    ).toEqual([]);
  });

  it("does not turn a seated person disappearing into a fall without collapse evidence", () => {
    expect(
      run(
        timeline([
          { hold: standing(), ms: 300 },
          { from: standing(), to: standing(0.7), ms: 400 },
          { hold: null, ms: 6000 },
        ]),
      ),
    ).toEqual([]);
  });

  it("handles a fall when only the torso is visible", () => {
    const cropped = (pose: ReturnType<typeof standing>) =>
      pose.map((point, index) => (index >= 25 ? { ...point, visibility: 0 } : point));
    const upright = cropped(standing());
    const down = cropped(lying());
    expect(
      run(
        timeline([
          { hold: upright, ms: 2000 },
          { from: upright, to: down, ms: 600 },
          { hold: down, ms: 5000 },
        ]),
      ),
    ).toHaveLength(1);
  });

  it("detects the same fall with portrait and landscape camera coordinates", () => {
    const frames = timeline([stand, fall, { hold: lying(), ms: 5000 }]);
    for (const ratio of [9 / 16, 16 / 9]) {
      const cameraFrames = frames.map((frame) => ({
        ...frame,
        imageAspectRatio: ratio,
        poses: frame.poses.map((pose) =>
          pose.map((point) => ({ ...point, x: 0.5 + (point.x - 0.5) / ratio })),
        ),
      }));
      expect(run(cameraFrames)).toHaveLength(1);
    }
  });

  it("alerts when the model stops seeing someone right after they hit the floor", () => {
    // Pose models often lose a person lying down: two falling frames, then nothing.
    const quick = timeline(
      [stand, { from: standing(), to: lying(0.72), ms: 250 }, { hold: null, ms: 4000 }],
      8,
    );
    expect(run(quick)).toHaveLength(1);
  });

  it("alerts when only the head is visible and it drops to the floor", () => {
    // Shoulders and hips hidden: only the nose is found, as when someone is close to the camera.
    const headOnly = (pose: ReturnType<typeof standing>) =>
      pose.map((point, index) => (index === 0 ? point : { ...point, visibility: 0 }));
    const up = headOnly(standing());
    const down = headOnly(lying(0.85));
    expect(
      run(
        timeline(
          [
            { hold: up, ms: 2000 },
            { from: up, to: down, ms: 300 },
            { hold: down, ms: 1500 },
          ],
          8,
        ),
      ),
    ).toHaveLength(1);
    // Sitting down lowers the head only a little: not a fall.
    const seated = headOnly(standing(0.62));
    expect(
      run(
        timeline(
          [
            { hold: up, ms: 2000 },
            { from: up, to: seated, ms: 400 },
            { hold: seated, ms: 4000 },
          ],
          8,
        ),
      ),
    ).toEqual([]);
  });

  it("alerts when the head is near the floor level learned from the feet", () => {
    // Slow, with the body hidden on the way down: only the head reaching the floor tells.
    const headOnly = (pose: ReturnType<typeof standing>) =>
      pose.map((point, index) => (index === 0 ? point : { ...point, visibility: 0 }));
    const down = headOnly(lying(0.8));
    expect(
      run(
        timeline(
          [stand, { from: headOnly(standing()), to: down, ms: 3000 }, { hold: down, ms: 1500 }],
          8,
        ),
      ),
    ).toHaveLength(1);
    // A crouch keeps the head well above the floor.
    expect(
      run(
        timeline(
          [stand, { from: standing(), to: crouching(), ms: 750 }, { hold: crouching(), ms: 5000 }],
          8,
        ),
      ),
    ).toEqual([]);
  });

  it("alerts when someone ends up sitting on the floor, but not on a chair", () => {
    // Legs stretched toward the camera are not found; only the upper body is.
    const upperBody = (pose: ReturnType<typeof standing>) =>
      pose.map((point, index) => (index >= 25 ? { ...point, visibility: 0 } : point));
    const onFloor = upperBody(leaning(0.75, 25));
    expect(
      run(
        timeline(
          [stand, { from: standing(), to: onFloor, ms: 1500 }, { hold: onFloor, ms: 3000 }],
          8,
        ),
      ),
    ).toHaveLength(1);
    const onChair = upperBody(standing(0.63));
    expect(
      run(
        timeline(
          [stand, { from: standing(), to: onChair, ms: 1000 }, { hold: onChair, ms: 5000 }],
          8,
        ),
      ),
    ).toEqual([]);
  });

  it("alerts when a close-up person drops out of the bottom of the picture", () => {
    const close = standing(0.7, 0.25);
    const out = timeline(
      [
        { hold: close, ms: 2000 },
        { from: close, to: lying(0.92, 0.25), ms: 250 },
        { hold: null, ms: 4000 },
      ],
      8,
    );
    expect(run(out)).toHaveLength(1);
    // Leaving through the side while upright is not a fall.
    const walkOut = timeline(
      [
        { hold: close, ms: 2000 },
        { hold: null, ms: 4000 },
      ],
      8,
    );
    expect(run(walkOut)).toEqual([]);
  });

  it("requires more than one collapsed pose before inferring an occluded fall", () => {
    expect(run(timeline([stand, { hold: lying(0.6), ms: 100 }, { hold: null, ms: 6000 }]))).toEqual(
      [],
    );
  });

  it("detects an initially fast supported fall that settles more slowly at 8 fps", () => {
    expect(
      run(
        timeline(
          [
            stand,
            { from: standing(), to: leaning(), ms: 250 },
            { from: leaning(), to: lying(0.7), ms: 1250 },
            { hold: lying(0.7), ms: 5000 },
          ],
          8,
        ),
      ),
    ).toHaveLength(1);
  });

  it("detects a rapid full-body depth collapse with little hip descent at 8 fps", () => {
    const down = depthCollapsed();
    expect(
      run(timeline([stand, { from: standing(), to: down, ms: 500 }, { hold: down, ms: 5000 }], 8)),
    ).toHaveLength(1);
    expect(run(timeline([{ hold: down, ms: 6000 }], 8))).toEqual([]);
    expect(
      run(timeline([stand, { from: standing(), to: down, ms: 4000 }, { hold: down, ms: 6000 }], 8)),
    ).toEqual([]);
  });

  it("does not mistake bending or kneeling for a fall, and reports staying on the floor at 8 fps", () => {
    const bent = leaning(0.5, 80);
    expect(
      run(timeline([stand, { from: standing(), to: bent, ms: 375 }, { hold: bent, ms: 6000 }], 8)),
    ).toEqual([]);
    const kneel = standing(0.64);
    expect(
      run(
        timeline(
          [
            stand,
            { from: standing(), to: kneel, ms: 750 },
            { hold: kneel, ms: 750 },
            { from: kneel, to: lying(0.7), ms: 1500 },
            { hold: lying(0.7), ms: 1000 },
          ],
          8,
        ),
      ),
    ).toEqual([]);
    expect(
      run(
        timeline(
          [
            stand,
            { from: standing(), to: kneel, ms: 750 },
            { from: kneel, to: lying(0.7), ms: 1500 },
            { hold: lying(0.7), ms: 6000 },
          ],
          8,
        ),
      ),
    ).toHaveLength(1);
  });

  it("discards motion evidence when the tracked person is replaced by a distant lying body", () => {
    expect(run(timeline([stand, { hold: lying(0.8, 0.15, 0.85), ms: 6000 }], 8))).toEqual([]);
  });

  it("does not infer a fall across a long gap with no pose updates", () => {
    const before = timeline([stand], 8);
    const after = timeline([{ hold: lying(), ms: 6000 }], 8).map((frame) => ({
      ...frame,
      time: frame.time + 4000,
    }));
    expect(run([...before, ...after])).toEqual([]);
  });

  it("does not use an isolated high hip estimate as the start of a fast fall", () => {
    const down = lying(0.6);
    expect(
      run(
        timeline(
          [
            stand,
            { hold: standing(0.2), ms: 125 },
            { hold: standing(), ms: 125 },
            { from: standing(), to: down, ms: 3000 },
            { hold: down, ms: 200 },
          ],
          8,
        ),
      ),
    ).toEqual([]);
  });

  it("detects a short collapse in a cropped portrait view at 8 fps", () => {
    const crop = (pose: ReturnType<typeof standing>) =>
      pose.map((point, index) => ({
        ...point,
        x: 0.5 + (point.x - 0.5) / (9 / 16),
        visibility: index >= 25 ? 0 : point.visibility,
      }));
    const up = crop(standing());
    const down = crop(lying(0.6));
    const frames = timeline(
      [
        { hold: up, ms: 2000 },
        { from: up, to: down, ms: 375 },
        { hold: down, ms: 5000 },
      ],
      8,
    ).map((frame) => ({ ...frame, imageAspectRatio: 9 / 16 }));
    expect(run(frames)).toHaveLength(1);
  });

  it("continues a depth fall when the person is occluded and cancels visible recovery", () => {
    const down = depthCollapsed();
    const collapse = { from: standing(), to: down, ms: 500 };
    expect(run(timeline([stand, collapse, { hold: null, ms: 5000 }], 8))).toHaveLength(1);
    expect(
      run(timeline([stand, collapse, { hold: down, ms: 700 }, { hold: standing(), ms: 2000 }], 8)),
    ).toEqual([]);
    expect(run(timeline([stand, { hold: down, ms: 125 }, { hold: null, ms: 6000 }], 8))).toEqual(
      [],
    );
  });

  it("does not extrapolate staying down after visible recovery followed by leaving view", () => {
    expect(
      run(
        timeline(
          [
            stand,
            fall,
            { hold: lying(), ms: 400 },
            { hold: standing(), ms: 750 },
            { hold: null, ms: 5000 },
          ],
          8,
        ),
      ),
    ).toEqual([]);
  });

  it("recalibrates body scale after losing the person before a later fall", () => {
    const smaller = standing(0.5, 0.075);
    const down = lying(0.65, 0.075);
    expect(
      run(
        timeline(
          [
            { hold: standing(0.5, 0.3), ms: 2000 },
            { hold: null, ms: 2000 },
            { hold: smaller, ms: 250 },
            { from: smaller, to: down, ms: 750 },
            { hold: down, ms: 5000 },
          ],
          8,
        ),
      ),
    ).toHaveLength(1);
  });

  it("recognizes staying prone with shoulders below the hips after a fast descent", () => {
    const prone = leaning(0.75, 180, 0.1);
    expect(
      run(
        timeline([stand, { from: standing(), to: prone, ms: 500 }, { hold: prone, ms: 5000 }], 8),
      ),
    ).toHaveLength(1);
    expect(run(timeline([{ hold: prone, ms: 6000 }], 8))).toEqual([]);
  });

  it("keeps a confirmed occluded fall when a distant pose appears instead of the tracked person", () => {
    expect(
      run(
        timeline(
          [stand, fall, { hold: lying(), ms: 1000 }, { hold: standing(0.5, 0.15, 0.9), ms: 5000 }],
          8,
        ),
      ),
    ).toHaveLength(1);
  });

  it("does not confuse compact crouching or hidden feet with a depth fall", () => {
    for (const hideFeet of [false, true]) {
      const crouch = crouching(hideFeet);
      expect(
        run(
          timeline(
            [stand, { from: standing(), to: crouch, ms: 750 }, { hold: crouch, ms: 12000 }],
            8,
          ),
          fallPreset(),
        ),
        `hidden feet ${hideFeet}`,
      ).toEqual([]);
    }
  });

  it("does not infer a floor fall from a tilted crouch that then disappears", () => {
    const crouch = leaning(0.7, 40);
    expect(
      run(
        timeline(
          [
            stand,
            { from: standing(), to: crouch, ms: 500 },
            { hold: crouch, ms: 375 },
            { hold: null, ms: 12000 },
          ],
          8,
        ),
        fallPreset(),
      ),
    ).toEqual([]);
  });

  it("does not treat wide knees with an upright trunk as lying down", () => {
    const wide = crouching().map((point, index) =>
      index === 25 ? { ...point, x: 0.28 } : index === 26 ? { ...point, x: 0.72 } : point,
    );
    expect(
      run(
        timeline([stand, { from: standing(), to: wide, ms: 750 }, { hold: wide, ms: 12000 }], 8),
        fallPreset(),
      ),
    ).toEqual([]);
  });
});
