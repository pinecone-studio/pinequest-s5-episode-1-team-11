import { describe, expect, it, vi } from "vitest";
import { SourceResumer } from "./source-resumer";
import type { VideoSource } from "./video-source";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function setup() {
  const track = { readyState: "live" as MediaStreamTrackState };
  const play = vi.fn(async () => {});
  const source: VideoSource = {
    video: {
      srcObject: { getVideoTracks: () => [track] },
      error: null,
      play,
    } as unknown as HTMLVideoElement,
    audio: null,
    stop: vi.fn(),
  };
  const events = {
    canResume: vi.fn(() => true),
    onResuming: vi.fn(),
    onResumed: vi.fn(),
    onInterrupted: vi.fn(),
  };
  return { source, track, play, events, resumer: new SourceResumer(events) };
}

describe("source resumption", () => {
  it("starts audio before playback and reports successful current resumption", async () => {
    const { source, play, events, resumer } = setup();
    const order: string[] = [];
    events.onResuming.mockImplementation(() => order.push("resuming"));
    play.mockImplementation(async () => {
      order.push("play");
    });
    events.onResumed.mockImplementation(() => order.push("resumed"));

    await resumer.resume(source);

    expect(order).toEqual(["resuming", "play", "resumed"]);
    expect(events.onResuming).toHaveBeenCalledWith(source);
    expect(events.onResumed).toHaveBeenCalledWith(source);
    expect(events.onInterrupted).not.toHaveBeenCalled();
  });

  it("does nothing when monitoring cannot resume", async () => {
    const { source, play, events, resumer } = setup();
    events.canResume.mockReturnValue(false);

    await resumer.resume(source);

    expect(play).not.toHaveBeenCalled();
    expect(events.onResuming).not.toHaveBeenCalled();
    expect(events.onResumed).not.toHaveBeenCalled();
    expect(events.onInterrupted).not.toHaveBeenCalled();
  });

  it("interrupts an ended camera before requesting playback", async () => {
    const { source, track, play, events, resumer } = setup();
    track.readyState = "ended";

    await resumer.resume(source);

    expect(play).not.toHaveBeenCalled();
    expect(events.onResuming).not.toHaveBeenCalled();
    expect(events.onResumed).not.toHaveBeenCalled();
    expect(events.onInterrupted).toHaveBeenCalledWith(source);
  });

  it("checks camera health again after pending playback resolves", async () => {
    const { source, track, play, events, resumer } = setup();
    const playback = deferred();
    play.mockReturnValue(playback.promise);

    const resuming = resumer.resume(source);
    track.readyState = "ended";
    playback.resolve();
    await resuming;

    expect(events.onResumed).not.toHaveBeenCalled();
    expect(events.onInterrupted).toHaveBeenCalledWith(source);
  });

  it("reports a current playback failure without leaving a rejected resume promise", async () => {
    const { source, play, events, resumer } = setup();
    play.mockRejectedValue(new Error("Camera playback failed"));

    await resumer.resume(source);

    expect(events.onResumed).not.toHaveBeenCalled();
    expect(events.onInterrupted).toHaveBeenCalledWith(source);
  });

  it("ignores playback rejected after an intentional pause", async () => {
    const { source, play, events, resumer } = setup();
    const playback = deferred();
    play.mockReturnValue(playback.promise);

    const resuming = resumer.resume(source);
    events.canResume.mockReturnValue(false);
    playback.reject(new Error("Playback interrupted by pause"));
    await resuming;

    expect(events.onResumed).not.toHaveBeenCalled();
    expect(events.onInterrupted).not.toHaveBeenCalled();
  });

  it("ignores successful playback after the page becomes hidden", async () => {
    const { source, play, events, resumer } = setup();
    const playback = deferred();
    play.mockReturnValue(playback.promise);

    const resuming = resumer.resume(source);
    events.canResume.mockReturnValue(false);
    playback.resolve();
    await resuming;

    expect(events.onResumed).not.toHaveBeenCalled();
    expect(events.onInterrupted).not.toHaveBeenCalled();
  });

  it("ignores an earlier playback rejection after a newer resume succeeds", async () => {
    const { source, play, events, resumer } = setup();
    const previous = deferred();
    play.mockReturnValueOnce(previous.promise);
    const older = resumer.resume(source);

    await resumer.resume(source);
    previous.reject(new Error("Older play request interrupted"));
    await older;

    expect(events.onResumed).toHaveBeenCalledOnce();
    expect(events.onInterrupted).not.toHaveBeenCalled();
  });

  it("does not let an older successful resume override a newer source failure", async () => {
    const { source, play, events, resumer } = setup();
    const previous = deferred();
    play.mockReturnValueOnce(previous.promise);
    play.mockRejectedValueOnce(new Error("Current play failed"));
    const older = resumer.resume(source);

    await resumer.resume(source);
    previous.resolve();
    await older;

    expect(events.onInterrupted).toHaveBeenCalledOnce();
    expect(events.onResumed).not.toHaveBeenCalled();
  });

  it.each(["resolve", "reject"] as const)("ignores playback %s after cleanup", async (outcome) => {
    const { source, play, events, resumer } = setup();
    const playback = deferred();
    play.mockReturnValue(playback.promise);
    const resuming = resumer.resume(source);

    resumer.cancel();
    if (outcome === "resolve") playback.resolve();
    else playback.reject(new Error("Camera closed"));
    await resuming;

    expect(events.onResumed).not.toHaveBeenCalled();
    expect(events.onInterrupted).not.toHaveBeenCalled();
  });

  it("does not request playback when onResuming cancels the attempt", async () => {
    const { source, play, events, resumer } = setup();
    events.onResuming.mockImplementation(() => resumer.cancel());

    await resumer.resume(source);

    expect(events.onResuming).toHaveBeenCalledOnce();
    expect(play).not.toHaveBeenCalled();
    expect(events.onResumed).not.toHaveBeenCalled();
    expect(events.onInterrupted).not.toHaveBeenCalled();
  });
});
