import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDetectionSettings } from "@/contracts";
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
    pose = { detect: vi.fn(() => []), close: vi.fn() };
    sound = { close: vi.fn(async () => {}) };
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

  it("releases the loaded pose model if audio initialization fails", async () => {
    const error = new Error("Audio initialization failed");
    vi.mocked(createSoundRunner).mockRejectedValueOnce(error);
    const watcher = new Watcher(source, defaultDetectionSettings, { onDetection: vi.fn() });

    await expect(watcher.start()).rejects.toBe(error);

    expect(pose.close).toHaveBeenCalledOnce();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("closes a pose model loaded after stop without starting the microphone", async () => {
    const loading = deferred<PoseRunner>();
    vi.mocked(createPoseRunner).mockReturnValueOnce(loading.promise);
    const watcher = new Watcher(source, defaultDetectionSettings, { onDetection: vi.fn() });

    const starting = watcher.start();
    await watcher.stop();
    loading.resolve(pose);
    await starting;

    expect(pose.close).toHaveBeenCalledOnce();
    expect(createSoundRunner).not.toHaveBeenCalled();
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
    expect(requestAnimationFrame).not.toHaveBeenCalled();
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
});
