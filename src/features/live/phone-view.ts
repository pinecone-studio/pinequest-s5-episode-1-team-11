import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { ICE_SERVERS, isLiveSignal, LIVE_EVENT, type LiveSignal } from "./protocol";

export type PhoneViewEnd = "idle" | "busy" | "timeout" | "ended" | "failed";
const HELLO_EVERY_MS = 3000;
const GIVE_UP_MS = 20_000;

/**
 * Watches a phone or laptop camera: says hello on its broadcast channel until the camera offers a
 * direct WebRTC connection. Shared by the device page and the app's /watch WebView.
 * Returns stop(); `onEnd` runs exactly once.
 */
export function watchPhone(
  client: SupabaseClient,
  channelName: string,
  on: {
    stream: (stream: MediaStream) => void;
    blocked: (blocked: boolean) => void;
    end: (reason: PhoneViewEnd) => void;
  },
) {
  const viewer = crypto.randomUUID();
  let connection: RTCPeerConnection | null = null;
  let channel: RealtimeChannel | null = null;
  let answered = false;
  let over = false;
  const pending: RTCIceCandidateInit[] = [];
  const send = (signal: LiveSignal) =>
    void channel?.send({ type: "broadcast", event: LIVE_EVENT, payload: signal });

  const hello = setInterval(() => {
    if (!answered) send({ kind: "hello", viewer });
  }, HELLO_EVERY_MS);
  const giveUp = setTimeout(() => {
    if (!answered) finish("timeout", true);
  }, GIVE_UP_MS);

  function finish(reason: PhoneViewEnd, notify: boolean) {
    if (over) return;
    over = true;
    clearInterval(hello);
    clearTimeout(giveUp);
    if (notify) send({ kind: "bye", viewer, from: "viewer" });
    connection?.close();
    connection = null;
    if (channel) void channel.unsubscribe();
    channel = null;
    on.end(reason);
  }

  async function receive(signal: LiveSignal) {
    if (signal.viewer !== viewer) return;
    if (signal.kind === "busy") return finish("busy", false);
    if (signal.kind === "bye" && signal.from === "camera") return finish("ended", false);
    if (signal.kind === "blocked") return on.blocked(signal.blocked);
    if (signal.kind === "offer") {
      answered = true;
      connection?.close();
      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      connection = peer;
      peer.ontrack = ({ streams }) => {
        if (streams[0]) on.stream(streams[0]);
      };
      peer.onicecandidate = ({ candidate }) => {
        if (candidate) send({ kind: "ice", viewer, from: "viewer", candidate: candidate.toJSON() });
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") finish("failed", true);
      };
      await peer.setRemoteDescription({ type: "offer", sdp: signal.sdp });
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      send({ kind: "answer", viewer, sdp: answer.sdp ?? "" });
      for (const candidate of pending.splice(0)) await peer.addIceCandidate(candidate);
    } else if (signal.kind === "ice" && signal.from === "camera") {
      if (connection?.remoteDescription) await connection.addIceCandidate(signal.candidate);
      else pending.push(signal.candidate);
    }
  }

  channel = client
    .channel(channelName, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: LIVE_EVENT }, ({ payload }) => {
      if (isLiveSignal(payload)) void receive(payload).catch(() => finish("failed", true));
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") send({ kind: "hello", viewer });
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") finish("failed", false);
    });

  return () => finish("idle", true);
}
