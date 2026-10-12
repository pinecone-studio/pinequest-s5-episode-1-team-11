/**
 * On-demand live view: WebRTC straight from the camera phone to a family member's browser.
 * Signaling runs over a Supabase Realtime broadcast channel whose name only the server can
 * derive. Video is never stored and does not pass through Halo's server.
 */
export const LIVE_EVENT = "signal";
export const MAX_VIEWERS = 3;
/** A view ends by itself so a forgotten tab does not keep watching. */
export const MAX_VIEW_MS = 10 * 60_000;
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export type LiveSignal =
  | { kind: "hello"; viewer: string }
  | { kind: "offer"; viewer: string; sdp: string }
  | { kind: "answer"; viewer: string; sdp: string }
  | { kind: "ice"; viewer: string; from: "camera" | "viewer"; candidate: RTCIceCandidateInit }
  | { kind: "busy"; viewer: string }
  | { kind: "blocked"; viewer: string; blocked: boolean }
  | { kind: "bye"; viewer: string; from: "camera" | "viewer" };

export function isLiveSignal(value: unknown): value is LiveSignal {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { kind?: unknown }).kind === "string" &&
    typeof (value as { viewer?: unknown }).viewer === "string"
  );
}
