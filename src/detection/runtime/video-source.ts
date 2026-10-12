/**
 * Where frames and sound come from. The browser camera today; a CCTV stream
 * (go2rtc WebRTC) plugs in with the same shape.
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
      frameRate: { ideal: 15, max: 30 },
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

/**
 * A CCTV/IP camera relayed by go2rtc (RTSP → WebRTC). `url` is go2rtc's
 * WebRTC endpoint, e.g. http://localhost:1984/api/webrtc?src=hall
 */
export async function go2rtcSource(video: HTMLVideoElement, url: string): Promise<VideoSource> {
  const peer = new RTCPeerConnection();
  peer.addTransceiver("video", { direction: "recvonly" });
  peer.addTransceiver("audio", { direction: "recvonly" });
  const stream = new MediaStream();
  peer.ontrack = ({ track }) => stream.addTrack(track);
  await peer.setLocalDescription(await peer.createOffer());
  // go2rtc answers a complete offer in one request; wait for ICE candidates first.
  await new Promise<void>((resolve) => {
    if (peer.iceGatheringState === "complete") return resolve();
    const timeout = setTimeout(resolve, 2000);
    peer.onicegatheringstatechange = () => {
      if (peer.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
      }
    };
  });
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: peer.localDescription?.sdp,
  });
  if (!response.ok) {
    peer.close();
    throw new Error(`go2rtc answered ${response.status}`);
  }
  await peer.setRemoteDescription({ type: "answer", sdp: await response.text() });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("No video from go2rtc")), 10_000);
    const check = () => {
      if (stream.getVideoTracks().length) {
        clearTimeout(timeout);
        resolve();
      }
    };
    peer.addEventListener("track", check);
    check();
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play().catch(() => undefined);
  return {
    video,
    audio: stream.getAudioTracks().length ? stream : null,
    stop: () => {
      peer.close();
      video.srcObject = null;
    },
  };
}
