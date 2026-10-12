"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  ICE_SERVERS,
  isLiveSignal,
  LIVE_EVENT,
  type LiveSignal,
  MAX_VIEW_MS,
  MAX_VIEWERS,
} from "./protocol";

type Peer = {
  /** The channel the viewer asked on; all its signals stay on it. */
  channel: RealtimeChannel;
  connection: RTCPeerConnection;
  tracks: MediaStreamTrack[];
  pending: RTCIceCandidateInit[];
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Runs on the camera. Answers family members who ask to watch, one peer connection each.
 * Sends copies of the camera tracks, so blocking the view never disturbs detection.
 */
export class LiveHost {
  private channels = new Map<string, RealtimeChannel>();
  private peers = new Map<string, Peer>();
  private blocked = false;

  constructor(
    private getStream: () => MediaStream | null,
    private onViewers: (count: number) => void,
  ) {}

  /** Listens on exactly these channel names. Viewers on a dropped name are disconnected. */
  setChannels(names: readonly string[]) {
    const client = createClient();
    if (!client) return;
    for (const [name, channel] of this.channels) {
      if (names.includes(name)) continue;
      for (const [viewer, peer] of this.peers)
        if (peer.channel === channel) this.close(viewer, true);
      void channel.unsubscribe();
      this.channels.delete(name);
    }
    for (const name of names) {
      if (this.channels.has(name)) continue;
      const channel = client
        .channel(name, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: LIVE_EVENT }, ({ payload }) => {
          if (isLiveSignal(payload)) void this.receive(channel, payload);
        })
        .subscribe();
      this.channels.set(name, channel);
    }
  }

  /** Privacy curtain or a paused monitor: viewers stay connected but see and hear nothing. */
  setBlocked(blocked: boolean) {
    this.blocked = blocked;
    for (const [viewer, peer] of this.peers) {
      for (const track of peer.tracks) track.enabled = !blocked;
      this.send(peer.channel, { kind: "blocked", viewer, blocked });
    }
  }

  stop() {
    for (const viewer of [...this.peers.keys()]) this.close(viewer, true);
    for (const channel of this.channels.values()) void channel.unsubscribe();
    this.channels.clear();
  }

  private send(channel: RealtimeChannel, signal: LiveSignal) {
    void channel.send({ type: "broadcast", event: LIVE_EVENT, payload: signal });
  }

  private async receive(channel: RealtimeChannel, signal: LiveSignal) {
    if (signal.kind === "hello") return this.offer(channel, signal.viewer);
    const peer = this.peers.get(signal.viewer);
    // A viewer's signals only count on the channel it joined through.
    if (!peer || peer.channel !== channel) return;
    if (signal.kind === "answer") {
      await peer.connection.setRemoteDescription({ type: "answer", sdp: signal.sdp });
      for (const candidate of peer.pending.splice(0))
        await peer.connection.addIceCandidate(candidate);
    } else if (signal.kind === "ice" && signal.from === "viewer") {
      if (peer.connection.remoteDescription)
        await peer.connection.addIceCandidate(signal.candidate);
      else peer.pending.push(signal.candidate);
    } else if (signal.kind === "bye" && signal.from === "viewer") {
      this.close(signal.viewer, false);
    }
  }

  private async offer(channel: RealtimeChannel, viewer: string) {
    // A repeated hello from the same viewer restarts its connection.
    if (this.peers.has(viewer)) this.close(viewer, false);
    if (this.peers.size >= MAX_VIEWERS) return this.send(channel, { kind: "busy", viewer });
    const stream = this.getStream();
    if (!stream) return this.send(channel, { kind: "busy", viewer });
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const out = new MediaStream();
    const tracks = stream
      .getTracks()
      .filter((track) => track.readyState === "live")
      .map((track) => {
        const copy = track.clone();
        copy.enabled = !this.blocked;
        out.addTrack(copy);
        connection.addTrack(copy, out);
        return copy;
      });
    const peer: Peer = {
      channel,
      connection,
      tracks,
      pending: [],
      timer: setTimeout(() => this.close(viewer, true), MAX_VIEW_MS),
    };
    this.peers.set(viewer, peer);
    this.onViewers(this.peers.size);
    connection.onicecandidate = ({ candidate }) => {
      if (candidate)
        this.send(channel, { kind: "ice", viewer, from: "camera", candidate: candidate.toJSON() });
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "failed" || connection.connectionState === "closed")
        this.close(viewer, false);
    };
    const description = await connection.createOffer();
    await connection.setLocalDescription(description);
    this.send(channel, { kind: "offer", viewer, sdp: description.sdp ?? "" });
    if (this.blocked) this.send(channel, { kind: "blocked", viewer, blocked: true });
  }

  private close(viewer: string, notify: boolean) {
    const peer = this.peers.get(viewer);
    if (!peer) return;
    this.peers.delete(viewer);
    clearTimeout(peer.timer);
    for (const track of peer.tracks) track.stop();
    peer.connection.close();
    if (notify) this.send(peer.channel, { kind: "bye", viewer, from: "camera" });
    this.onViewers(this.peers.size);
  }
}
