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
