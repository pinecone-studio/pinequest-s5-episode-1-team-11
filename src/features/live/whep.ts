import { MAX_VIEW_MS } from "./protocol";

/**
 * Plays a CCTV camera from the camera server (MediaMTX WHEP). Waits for ICE gathering and sends
 * one offer, so no trickle. Resolves with a stop function; `ended` fires on failure or after
 * MAX_VIEW_MS, like a phone camera's view.
 */
export async function playWhep(
  url: string,
  token: string,
  onStream: (stream: MediaStream) => void,
  ended: (reason: "failed" | "ended") => void,
): Promise<() => void> {
  const peer = new RTCPeerConnection();
  peer.addTransceiver("video", { direction: "recvonly" });
  peer.addTransceiver("audio", { direction: "recvonly" });
  peer.ontrack = ({ streams }) => {
    if (streams[0]) onStream(streams[0]);
  };
  let done = false;
  const timer = setTimeout(() => stop("ended"), MAX_VIEW_MS);
  function stop(reason?: "failed" | "ended") {
    if (done) return;
    done = true;
    clearTimeout(timer);
    peer.close();
    if (reason) ended(reason);
  }
  peer.onconnectionstatechange = () => {
    if (peer.connectionState === "failed") stop("failed");
  };
  try {
    await peer.setLocalDescription(await peer.createOffer());
    await new Promise<void>((resolve) => {
      if (peer.iceGatheringState === "complete") return resolve();
      const give = setTimeout(resolve, 2000);
      peer.onicegatheringstatechange = () => {
        if (peer.iceGatheringState === "complete") {
          clearTimeout(give);
          resolve();
        }
      };
    });
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/sdp", authorization: `Bearer ${token}` },
      body: peer.localDescription?.sdp,
    });
    if (!response.ok) throw new Error(`camera server answered ${response.status}`);
    await peer.setRemoteDescription({ type: "answer", sdp: await response.text() });
  } catch (error) {
    stop();
    throw error;
  }
  return () => stop();
}
