import { describe, expect, it } from "vitest";
import { LANDMARK, poseFeatures } from "./pose";
import { standing } from "./test-poses";

describe("camera pose measurements", () => {
  it("measures the same physical torso angle in portrait and landscape frames", () => {
    for (const ratio of [9 / 16, 16 / 9]) {
      const pose = standing().map((point, index) =>
        index === LANDMARK.leftShoulder || index === LANDMARK.rightShoulder
          ? { ...point, x: point.x - 0.1 / ratio, y: 0.4 }
          : point,
      );
      const features = poseFeatures(pose, ratio);
      expect(features?.torsoAngle).toBeCloseTo(45);
      expect(features?.torso).toBeCloseTo(Math.hypot(0.1, 0.1));
      expect(features?.hip).toEqual({ x: 0.5, y: 0.5 });
    }
  });

  it("does not mistake outstretched arms for a horizontal body", () => {
    const pose = standing().map((point, index) => {
      if (index === 15) return { x: 0.02, y: 0.4, visibility: 0.95 };
      if (index === 16) return { x: 0.98, y: 0.4, visibility: 0.95 };
      return point;
    });
    expect(poseFeatures(pose)?.aspect).toBeLessThan(0.5);
  });

  it("uses the other shoulder when one landmark is invalid", () => {
    const pose = standing().map((point, index) =>
      index === LANDMARK.leftShoulder ? { ...point, x: Number.NaN } : point,
    );
    expect(poseFeatures(pose)?.torso).toBeGreaterThan(0.1);
  });

  it("rejects landmarks without finite coordinates", () => {
    const pose = standing().map((point) => ({ ...point, y: Number.NaN }));
    expect(poseFeatures(pose)).toBeNull();
  });

  it("does not treat extrapolated offscreen hips as a visible body", () => {
    const pose = standing().map((point, index) =>
      index === LANDMARK.leftHip || index === LANDMARK.rightHip ? { ...point, y: 1.1 } : point,
    );
    expect(poseFeatures(pose)).toBeNull();
  });
});
