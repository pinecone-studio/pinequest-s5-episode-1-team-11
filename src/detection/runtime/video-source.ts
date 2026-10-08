/**
 * Where frames and sound come from. The browser camera today; a CCTV stream
 * (go2rtc WebRTC) or a recorded file plugs in with the same shape.
 */
export type VideoSource = {
  video: HTMLVideoElement;
  /** Microphone or stream audio; null when the source has no sound. */
  audio: MediaStream | null;
  stop(): void;
};

function attach(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  return video.play();
}

/** This device's camera and microphone. Rear camera on phones, modest resolution. */
export async function cameraSource(video: HTMLVideoElement): Promise<VideoSource> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 15, max: 30 },
    },
    // Processing meant for calls removes exactly the sounds we listen for.
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
  });
  await attach(video, stream);
  return {
    video,
    audio: stream.getAudioTracks().length ? stream : null,
    stop: () => {
      for (const track of stream.getTracks()) track.stop();
      video.srcObject = null;
    },
  };
}

/** A looping recording, for testing detection without acting out a fall. */
export async function fileSource(video: HTMLVideoElement, url: string): Promise<VideoSource> {
  video.srcObject = null;
  video.src = url;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  // Browsers may hold back autoplay in a hidden tab; it starts once the page is visible.
  await video.play().catch(() => undefined);
  // The recording's own sound track, when it has one (muting only silences the speaker).
  const captured =
    "captureStream" in video
      ? (video as HTMLVideoElement & { captureStream(): MediaStream }).captureStream()
      : null;
  const audio = captured?.getAudioTracks().length
    ? new MediaStream(captured.getAudioTracks())
    : null;
  return {
    video,
    audio,
    stop: () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    },
  };
}
