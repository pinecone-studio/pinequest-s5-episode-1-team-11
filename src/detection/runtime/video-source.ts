/** Where frames and sound come from: this device's camera. CCTV runs on the server (cctv/). */
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
export async function cameraSource(
  video: HTMLVideoElement,
  signal?: AbortSignal,
): Promise<VideoSource> {
  const abortError = () =>
    signal?.reason ?? new DOMException("Camera acquisition was aborted", "AbortError");
  if (signal?.aborted) throw abortError();
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: 640 },
      height: { ideal: 480 },
      // 30 fps keeps live view smooth; detection still samples only 10 fps (watcher TARGET_FPS).
      frameRate: { ideal: 30, max: 30 },
    },
    // Processing meant for calls removes exactly the sounds we listen for.
    audio: {
      channelCount: { ideal: 1 },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
  let stopped = false;
  let cancel: (() => void) | undefined;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (cancel) signal?.removeEventListener("abort", cancel);
    for (const track of stream.getTracks()) track.stop();
    // Cleanup from an older source must never detach the camera that replaced it.
    if (video.srcObject === stream) video.srcObject = null;
  };
  // getUserMedia itself is not cancelable: release a late result before touching the video.
  if (signal?.aborted) {
    stop();
    throw abortError();
  }
  const aborted = signal
    ? new Promise<never>((_resolve, reject) => {
        cancel = () => {
          stop();
          reject(abortError());
        };
        signal.addEventListener("abort", cancel, { once: true });
      })
    : null;
  try {
    const playback = attach(video, stream);
    await (aborted ? Promise.race([playback, aborted]) : playback);
    if (signal?.aborted) throw abortError();
  } catch (error) {
    stop();
    throw error;
  }
  return {
    video,
    audio: stream.getAudioTracks().length ? stream : null,
    stop,
  };
}
