import { expect, it } from "vitest";
import { unrotate } from "./pose-runner";

it("maps landmarks from a quarter-turned picture back to the camera picture", () => {
  // A point at the top-left of the camera picture (x 0.1, y 0.2).
  // Turned clockwise it appears at x = 1 - 0.2, y = 0.1; counter-clockwise at x = 0.2, y = 1 - 0.1.
  const [fromClockwise] = unrotate([{ x: 0.8, y: 0.1, visibility: 1 }], true);
  const [fromCounter] = unrotate([{ x: 0.2, y: 0.9, visibility: 1 }], false);
  for (const point of [fromClockwise, fromCounter]) {
    expect(point.x).toBeCloseTo(0.1);
    expect(point.y).toBeCloseTo(0.2);
  }
});
