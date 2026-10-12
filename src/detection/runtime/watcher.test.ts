import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDetectionSettings } from "@/contracts";
import { LANDMARK } from "../pose";
import { standing } from "../test-poses";
import { createPoseRunner, type PoseRunner } from "./pose-runner";
import { createSoundRunner, type SoundRunner } from "./sound-runner";
import type { VideoSource } from "./video-source";
import { Watcher } from "./watcher";

vi.mock("./pose-runner", () => ({ createPoseRunner: vi.fn() }));
vi.mock("./sound-runner", () => ({ createSoundRunner: vi.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("watcher resource lifecycle", () => {
  let pose: PoseRunner;
  let sound: SoundRunner;
  let source: VideoSource;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    pose = { detect: vi.fn(() => ({ poses: [], people: [] })), close: vi.fn() };
    sound = { resume: vi.fn(async () => {}), close: vi.fn(async () => {}) };
    source = {
      video: {} as HTMLVideoElement,
      audio: {} as MediaStream,
      stop: vi.fn(),
    };
    vi.mocked(createPoseRunner).mockResolvedValue(pose);
    vi.mocked(createSoundRunner).mockResolvedValue(sound);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps fall detection available and reports a microphone failure", async () => {
    const error = new Error("Audio initialization failed");
    vi.mocked(createSoundRunner).mockRejectedValueOnce(error);
    const onStats = vi.fn();
    const watcher = new Watcher(source, defaultDetectionSettings, {
      onDetection: vi.fn(),
      onStats,
    });

    await watcher.start();

    expect(pose.close).not.toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalled();
    expect(onStats).toHaveBeenLastCalledWith(expect.objectContaining({ audioState: "error" }));
    await watcher.stop();
  });

  it("closes both models loaded after stop without scheduling video frames", async () => {
    const loading = deferred<PoseRunner>();
    vi.mocked(createPoseRunner).mockReturnValueOnce(loading.promise);
    const watcher = new Watcher(source, defaultDetectionSettings, { onDetection: vi.fn() });

    const starting = watcher.start();
    await watcher.stop();
    loading.resolve(pose);
    await starting;

    expect(pose.close).toHaveBeenCalledOnce();
    expect(createSoundRunner).toHaveBeenCalledOnce();
    expect(sound.close).toHaveBeenCalledOnce();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("ignores late scores and closes audio loaded after stop", async () => {
    const loading = deferred<SoundRunner>();
    vi.mocked(createSoundRunner).mockReturnValueOnce(loading.promise);
    const onDetection = vi.fn();
    const watcher = new Watcher(source, defaultDetectionSettings, { onDetection });

    const starting = watcher.start();
    await Promise.resolve();
    await watcher.stop();
    const onScores = vi.mocked(createSoundRunner).mock.calls[0][1];
    onScores(1000, { scream: 0, cry: 0, glass: 0.9, alarm: 0 }, 0.5);
    loading.resolve(sound);
    await starting;

    expect(onDetection).not.toHaveBeenCalled();
    expect(pose.close).toHaveBeenCalledOnce();
    expect(sound.close).toHaveBeenCalledOnce();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("closes audio only once when stop calls overlap", async () => {
    const closing = deferred<void>();
    vi.mocked(sound.close).mockReturnValueOnce(closing.promise);
    const watcher = new Watcher(source, defaultDetectionSettings, { onDetection: vi.fn() });
    await watcher.start();

    const first = watcher.stop();
    const second = watcher.stop();
    closing.resolve();
    await Promise.all([first, second]);

    expect(pose.close).toHaveBeenCalledOnce();
    expect(sound.close).toHaveBeenCalledOnce();
  });

  it("starts the microphone before waiting for the pose model and resumes it from a gesture", async () => {
    const loading = deferred<PoseRunner>();
    vi.mocked(createPoseRunner).mockReturnValueOnce(loading.promise);
    const onStats = vi.fn();
    const watcher = new Watcher(source, defaultDetectionSettings, {
      onDetection: vi.fn(),
      onStats,
    });
    const starting = watcher.start();
    expect(createSoundRunner).toHaveBeenCalledOnce();
    vi.mocked(createSoundRunner).mock.calls[0][2]?.onState?.("suspended");
    expect(onStats).toHaveBeenLastCalledWith(expect.objectContaining({ audioState: "suspended" }));
    loading.resolve(pose);
    await starting;
    await watcher.resumeAudio();
    expect(sound.resume).toHaveBeenCalledOnce();
    await watcher.stop();
  });

  it("does not consume audio detections or cooldowns while paused", async () => {
    const onDetection = vi.fn();
    const watcher = new Watcher(source, defaultDetectionSettings, { onDetection });
    await watcher.start();
    const onScores = vi.mocked(createSoundRunner).mock.calls[0][1];
    watcher.setPaused(true);
    onScores(1000, { scream: 0, cry: 0, glass: 0.9, alarm: 0 }, 0.5);
    expect(onDetection).not.toHaveBeenCalled();
    watcher.setPaused(false);
    onScores(2000, { scream: 0, cry: 0, glass: 0.9, alarm: 0 }, 0.5);
    expect(onDetection).toHaveBeenCalledOnce();
    await watcher.stop();
  });

  it("shows that fall tracking needs visible hips even when a skeleton is present", async () => {
    vi.stubGlobal("performance", { now: () => 1000 });
    source.video = { readyState: 2, videoWidth: 1280, videoHeight: 720 } as HTMLVideoElement;
    vi.mocked(pose.detect).mockReturnValue({
      poses: [
        standing().map((point, index) =>
          index === LANDMARK.leftHip || index === LANDMARK.rightHip
            ? { ...point, visibility: 0.1 }
            : point,
        ),
      ],
      people: [],
    });
    const onStats = vi.fn();
    const watcher = new Watcher(source, defaultDetectionSettings, {
      onDetection: vi.fn(),
      onStats,
    });
    await watcher.start();
    vi.mocked(requestAnimationFrame).mock.calls[0][0](1000);
    expect(onStats).toHaveBeenLastCalledWith(
      expect.objectContaining({ people: 1, fallTracking: false }),
    );
    await watcher.stop();
  });

  it("reports usable fall tracking when shoulders and hips are visible", async () => {
    vi.stubGlobal("performance", { now: () => 1000 });
    source.video = { readyState: 2, videoWidth: 720, videoHeight: 1280 } as HTMLVideoElement;
    vi.mocked(pose.detect).mockReturnValue({ poses: [standing()], people: [] });
    const onStats = vi.fn();
    const watcher = new Watcher(source, defaultDetectionSettings, {
      onDetection: vi.fn(),
      onStats,
    });
    await watcher.start();
    vi.mocked(requestAnimationFrame).mock.calls[0][0](1000);
    expect(onStats).toHaveBeenLastCalledWith(
      expect.objectContaining({ people: 1, fallTracking: true }),
    );
    await watcher.stop();
  });
});
