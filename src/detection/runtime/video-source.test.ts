import { afterEach, expect, it, vi } from "vitest";
import { cameraSource } from "./video-source";

afterEach(() => vi.unstubAllGlobals());

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function media() {
  const stop = vi.fn();
  const stream = {
    getTracks: () => [{ stop }],
    getAudioTracks: () => [{}],
  } as unknown as MediaStream;
  return { stream, stop };
}

it("requests unprocessed mono audio for environmental sound recognition", async () => {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }], getAudioTracks: () => [{}] };
  const getUserMedia = vi.fn(async () => stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const video = { play: vi.fn(async () => {}), srcObject: null } as unknown as HTMLVideoElement;

  const source = await cameraSource(video);

  expect(getUserMedia).toHaveBeenCalledWith(
    expect.objectContaining({
      audio: {
        channelCount: { ideal: 1 },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    }),
  );
  expect(source.audio).toBe(stream);
  source.stop();
  expect(stop).toHaveBeenCalledOnce();
  expect(video.srcObject).toBeNull();
});

it("releases camera and microphone when video playback fails", async () => {
  const stopVideo = vi.fn();
  const stopAudio = vi.fn();
  const stream = { getTracks: () => [{ stop: stopVideo }, { stop: stopAudio }] };
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(async () => stream) } });
  const error = new Error("Playback blocked");
  const video = {
    play: vi.fn(async () => {
      throw error;
    }),
    srcObject: null,
  } as unknown as HTMLVideoElement;

  await expect(cameraSource(video)).rejects.toBe(error);

  expect(stopVideo).toHaveBeenCalledOnce();
  expect(stopAudio).toHaveBeenCalledOnce();
  expect(video.srcObject).toBeNull();
});

it("does not attach a canceled permission request that resolves after a new camera", async () => {
  const permissionA = deferred<MediaStream>();
  const permissionB = deferred<MediaStream>();
  const a = media();
  const b = media();
  const getUserMedia = vi
    .fn()
    .mockReturnValueOnce(permissionA.promise)
    .mockReturnValueOnce(permissionB.promise);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const video = { play: vi.fn(async () => {}), srcObject: null } as unknown as HTMLVideoElement;
  const controller = new AbortController();
  const pendingA = cameraSource(video, controller.signal);
  controller.abort();
  const pendingB = cameraSource(video);
  permissionB.resolve(b.stream);
  const sourceB = await pendingB;
  expect(video.srcObject).toBe(b.stream);

  const canceled = expect(pendingA).rejects.toMatchObject({ name: "AbortError" });
  permissionA.resolve(a.stream);
  await canceled;

  expect(a.stop).toHaveBeenCalledOnce();
  expect(b.stop).not.toHaveBeenCalled();
  expect(video.play).toHaveBeenCalledOnce();
  expect(video.srcObject).toBe(b.stream);
  sourceB.stop();
});

it("stops an aborted camera while playback is still pending", async () => {
  const playback = deferred<void>();
  const a = media();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(async () => a.stream) } });
  const video = {
    play: vi.fn(() => playback.promise),
    srcObject: null,
  } as unknown as HTMLVideoElement;
  const controller = new AbortController();
  const pending = cameraSource(video, controller.signal);
  const canceled = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  await vi.waitFor(() => expect(video.srcObject).toBe(a.stream));

  controller.abort();
  await canceled;

  expect(a.stop).toHaveBeenCalledOnce();
  expect(video.srcObject).toBeNull();
  playback.resolve();
});

it("stops a source idempotently without detaching a newer source", async () => {
  const a = media();
  const b = media();
  const getUserMedia = vi.fn().mockResolvedValueOnce(a.stream).mockResolvedValueOnce(b.stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const video = { play: vi.fn(async () => {}), srcObject: null } as unknown as HTMLVideoElement;
  const sourceA = await cameraSource(video);
  const sourceB = await cameraSource(video);

  sourceA.stop();
  sourceA.stop();

  expect(a.stop).toHaveBeenCalledOnce();
  expect(video.srcObject).toBe(b.stream);
  expect(b.stop).not.toHaveBeenCalled();
  sourceB.stop();
  expect(video.srcObject).toBeNull();
});

it("does not detach a newer camera when an older playback request fails", async () => {
  const playback = deferred<void>();
  const a = media();
  const b = media();
  const getUserMedia = vi.fn().mockResolvedValueOnce(a.stream).mockResolvedValueOnce(b.stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const video = {
    play: vi.fn().mockReturnValueOnce(playback.promise).mockResolvedValueOnce(undefined),
    srcObject: null,
  } as unknown as HTMLVideoElement;
  const pendingA = cameraSource(video);
  const error = new Error("Old playback failed");
  const failed = expect(pendingA).rejects.toBe(error);
  await vi.waitFor(() => expect(video.srcObject).toBe(a.stream));
  const sourceB = await cameraSource(video);

  playback.reject(error);
  await failed;

  expect(a.stop).toHaveBeenCalledOnce();
  expect(video.srcObject).toBe(b.stream);
  expect(b.stop).not.toHaveBeenCalled();
  sourceB.stop();
});

it("does not detach a newer camera when an older pending playback is aborted", async () => {
  const playback = deferred<void>();
  const a = media();
  const b = media();
  const getUserMedia = vi.fn().mockResolvedValueOnce(a.stream).mockResolvedValueOnce(b.stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const video = {
    play: vi.fn().mockReturnValueOnce(playback.promise).mockResolvedValueOnce(undefined),
    srcObject: null,
  } as unknown as HTMLVideoElement;
  const controller = new AbortController();
  const pendingA = cameraSource(video, controller.signal);
  const canceled = expect(pendingA).rejects.toMatchObject({ name: "AbortError" });
  await vi.waitFor(() => expect(video.srcObject).toBe(a.stream));
  const sourceB = await cameraSource(video);

  controller.abort();
  await canceled;

  expect(a.stop).toHaveBeenCalledOnce();
  expect(b.stop).not.toHaveBeenCalled();
  expect(video.srcObject).toBe(b.stream);
  playback.resolve();
  sourceB.stop();
});

it("does not request permission when acquisition has already been aborted", async () => {
  const getUserMedia = vi.fn();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  const video = { play: vi.fn(), srcObject: null } as unknown as HTMLVideoElement;
  const controller = new AbortController();
  controller.abort();

  await expect(cameraSource(video, controller.signal)).rejects.toMatchObject({
    name: "AbortError",
  });

  expect(getUserMedia).not.toHaveBeenCalled();
  expect(video.play).not.toHaveBeenCalled();
});
