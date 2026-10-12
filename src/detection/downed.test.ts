import { describe, expect, it } from "vitest";
import { DownedDetector } from "./downed";
import type { FallSignal } from "./fall";
import type { PersonBox, PoseFrame } from "./pose";
import { standing } from "./test-poses";

// standing(): head at y 0.305, feet at 0.77, so a standing height of about 0.47.
const onFloor: PersonBox = { x: 0.3, y: 0.68, width: 0.45, height: 0.12, score: 0.6 };
const onChair: PersonBox = { x: 0.4, y: 0.42, width: 0.2, height: 0.35, score: 0.7 };

function stand(from: number, to: number): PoseFrame[] {
  const frames: PoseFrame[] = [];
  for (let time = from; time <= to; time += 100) frames.push({ time, poses: [standing()] });
  return frames;
}
function boxes(from: number, to: number, box: (time: number) => PersonBox): PoseFrame[] {
  const frames: PoseFrame[] = [];
  for (let time = from; time <= to; time += 100)
    frames.push({ time, poses: [], people: [box(time)] });
  return frames;
}
function run(frames: PoseFrame[], detector = new DownedDetector()) {
  const signals: FallSignal[] = [];
  for (const frame of frames) {
    const signal = detector.update(frame);
    if (signal) signals.push(signal);
  }
  return signals;
}

describe("downed person backup", () => {
  it("reports someone seen standing who is now a still, lying-shaped box on the floor", () => {
    const signals = run([...stand(0, 2000), ...boxes(2100, 6000, () => onFloor)]);
    expect(signals).toHaveLength(1);
    expect(signals[0].onset).toBe(2100);
    expect(signals[0].time).toBeGreaterThanOrEqual(5100);
  });

  it("ignores someone sitting on a chair", () => {
    expect(run([...stand(0, 2000), ...boxes(2100, 8000, () => onChair)])).toEqual([]);
  });

  it("needs someone seen standing, and recently", () => {
    expect(run(boxes(0, 6000, () => onFloor))).toEqual([]);
    expect(run([...stand(0, 1000), ...boxes(70_000, 76_000, () => onFloor)])).toEqual([]);
  });

  it("waits while the box keeps moving (crawling, playing on the floor)", () => {
    const moving = (time: number) => ({ ...onFloor, x: 0.05 + ((time / 100) % 2) * 0.2 });
    expect(run([...stand(0, 2000), ...boxes(2100, 8000, moving)])).toEqual([]);
  });

  it("leaves the decision to the pose rules while a pose is visible", () => {
    const frames = [...stand(0, 2000), ...boxes(2100, 6000, () => onFloor)].map((frame) =>
      frame.people ? { ...frame, poses: [standing(0.8)] } : frame,
    );
    expect(run(frames)).toEqual([]);
  });

  it("reports once per fall, and again after the person was back on their feet", () => {
    const detector = new DownedDetector();
    expect(run([...stand(0, 2000), ...boxes(2100, 9000, () => onFloor)], detector)).toHaveLength(1);
    expect(
      run([...stand(9100, 11_000), ...boxes(11_100, 15_000, () => onFloor)], detector),
    ).toHaveLength(1);
  });
});
