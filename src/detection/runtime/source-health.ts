import type { VideoSource } from "./video-source";

function cameraStream(source: VideoSource): MediaStream | null {
  const stream = source.video.srcObject;
  return stream && "getVideoTracks" in stream && typeof stream.getVideoTracks === "function"
    ? (stream as MediaStream)
    : null;
}

/** Foreground check: a missing stream, ended camera tracks or playback error need a new source. */
export function isSourceEnded(source: VideoSource): boolean {
  if (source.video.error) return true;
  const stream = cameraStream(source);
  // A temporarily muted live track can recover. Paused playback is resumed by the caller.
  return stream === null || !stream.getVideoTracks().some((track) => track.readyState === "live");
}

/** Reports terminal interruption once. Muting during Safari backgrounding is recoverable. */
export function observeSource(source: VideoSource, onInterrupted: () => void): () => void {
  const stream = cameraStream(source);
  const tracks = new Set<MediaStreamTrack>();
  let disposed = false;
  let interrupted = false;
  const interrupt = () => {
    if (disposed || interrupted) return;
    interrupted = true;
    onInterrupted();
  };
  const check = () => {
    if (isSourceEnded(source)) interrupt();
  };
  const syncTracks = () => {
    if (disposed) return;
    const current = stream?.getVideoTracks() ?? [];
    for (const track of tracks) {
      if (current.includes(track)) continue;
      track.removeEventListener("ended", check);
      tracks.delete(track);
    }
    for (const track of current) {
      if (tracks.has(track)) continue;
      track.addEventListener("ended", check);
      tracks.add(track);
    }
    check();
  };
  source.video.addEventListener("error", interrupt);
  stream?.addEventListener("addtrack", syncTracks);
  stream?.addEventListener("removetrack", syncTracks);
  syncTracks();

  return () => {
    if (disposed) return;
    disposed = true;
    source.video.removeEventListener("error", interrupt);
    stream?.removeEventListener("addtrack", syncTracks);
    stream?.removeEventListener("removetrack", syncTracks);
    for (const track of tracks) track.removeEventListener("ended", check);
    tracks.clear();
  };
}
