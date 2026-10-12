import { describe, expect, it, vi } from "vitest";
import { isSourceEnded, observeSource } from "./source-health";
import type { VideoSource } from "./video-source";

class Track extends EventTarget {
  readyState: MediaStreamTrackState = "live";
  muted = false;

  end() {
    this.readyState = "ended";
    this.dispatchEvent(new Event("ended"));
  }
}

class Stream extends EventTarget {
  constructor(public tracks: Track[] = [new Track()]) {
    super();
  }

  getVideoTracks() {
    return this.tracks;
  }

  add(track: Track) {
    this.tracks.push(track);
    this.dispatchEvent(new Event("addtrack"));
  }

  remove(track: Track) {
    this.tracks = this.tracks.filter((item) => item !== track);
    this.dispatchEvent(new Event("removetrack"));
  }
}

class Video extends EventTarget {
  error: MediaError | null = null;
  paused = false;

  constructor(public srcObject: Stream | null) {
    super();
  }
}

function camera() {
  const stream = new Stream();
  const video = new Video(stream);
  const source: VideoSource = {
    video: video as unknown as HTMLVideoElement,
    audio: null,
    stop: vi.fn(),
  };
  return { source, stream, video, track: stream.tracks[0] };
}

describe("camera source health", () => {
  it("checks terminal track state after foregrounding even when the browser sent no event", () => {
    const { source, track } = camera();
    expect(isSourceEnded(source)).toBe(false);

    track.readyState = "ended";

    expect(isSourceEnded(source)).toBe(true);
  });

  it("allows background muting and paused playback to recover without a terminal interruption", () => {
    const { source, track, video } = camera();
    const interrupted = vi.fn();
    const dispose = observeSource(source, interrupted);

    video.paused = true;
    track.muted = true;
    track.dispatchEvent(new Event("mute"));
    expect(isSourceEnded(source)).toBe(false);
    track.muted = false;
    track.dispatchEvent(new Event("unmute"));
    expect(isSourceEnded(source)).toBe(false);
    expect(interrupted).not.toHaveBeenCalled();

    dispose();
  });

  it("reports camera disconnection once across repeated ended and video error events", () => {
    const { source, track, video } = camera();
    const interrupted = vi.fn();
    const dispose = observeSource(source, interrupted);

    track.end();
    track.dispatchEvent(new Event("ended"));
    video.dispatchEvent(new Event("error"));

    expect(interrupted).toHaveBeenCalledOnce();
    dispose();
  });

  it("detects an already-ended source when the observer attaches", () => {
    const { source, track } = camera();
    track.readyState = "ended";
    const interrupted = vi.fn();

    const dispose = observeSource(source, interrupted);

    expect(interrupted).toHaveBeenCalledOnce();
    dispose();
  });

  it("keeps a replacement video track live after the old track ends", () => {
    const { source, stream, track } = camera();
    const interrupted = vi.fn();
    const dispose = observeSource(source, interrupted);
    const replacement = new Track();

    stream.add(replacement);
    track.end();
    stream.remove(track);
    expect(isSourceEnded(source)).toBe(false);
    expect(interrupted).not.toHaveBeenCalled();
    replacement.end();

    expect(isSourceEnded(source)).toBe(true);
    expect(interrupted).toHaveBeenCalledOnce();
    dispose();
  });

  it("reports removal of the last video track even without an ended event", () => {
    const { source, stream, track } = camera();
    const interrupted = vi.fn();
    const dispose = observeSource(source, interrupted);

    stream.remove(track);

    expect(isSourceEnded(source)).toBe(true);
    expect(interrupted).toHaveBeenCalledOnce();
    dispose();
  });

  it("detects a camera stream lost while Safari was backgrounded", () => {
    const { source, video } = camera();
    expect(isSourceEnded(source)).toBe(false);

    video.srcObject = null;

    expect(isSourceEnded(source)).toBe(true);
    const interrupted = vi.fn();
    const dispose = observeSource(source, interrupted);
    expect(interrupted).toHaveBeenCalledOnce();
    dispose();
  });

  it("detects video playback errors even when the camera track is still live", () => {
    const { source, video } = camera();
    const interrupted = vi.fn();
    const dispose = observeSource(source, interrupted);
    expect(isSourceEnded(source)).toBe(false);
    expect(interrupted).not.toHaveBeenCalled();

    video.error = { code: 3 } as MediaError;
    video.dispatchEvent(new Event("error"));

    expect(isSourceEnded(source)).toBe(true);
    expect(interrupted).toHaveBeenCalledOnce();
    dispose();
  });

  it("detaches listeners from the stream, video and every observed track on cleanup", () => {
    const { source, stream, video, track } = camera();
    const interrupted = vi.fn();
    const videoRemove = vi.spyOn(video, "removeEventListener");
    const streamRemove = vi.spyOn(stream, "removeEventListener");
    const trackRemove = vi.spyOn(track, "removeEventListener");
    const dispose = observeSource(source, interrupted);
    const replacement = new Track();
    const replacementRemove = vi.spyOn(replacement, "removeEventListener");
    stream.add(replacement);

    dispose();
    dispose();
    track.end();
    replacement.end();
    video.dispatchEvent(new Event("error"));
    stream.remove(replacement);

    expect(interrupted).not.toHaveBeenCalled();
    expect(videoRemove).toHaveBeenCalledWith("error", expect.any(Function));
    expect(streamRemove).toHaveBeenCalledWith("addtrack", expect.any(Function));
    expect(streamRemove).toHaveBeenCalledWith("removetrack", expect.any(Function));
    expect(trackRemove).toHaveBeenCalledWith("ended", expect.any(Function));
    expect(replacementRemove).toHaveBeenCalledWith("ended", expect.any(Function));
    expect(trackRemove).toHaveBeenCalledTimes(1);
    expect(replacementRemove).toHaveBeenCalledTimes(1);
  });
});
