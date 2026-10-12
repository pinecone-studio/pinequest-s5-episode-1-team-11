import type { PairResponse } from "@/contracts";

/** A QR link must not discard a camera already paired in this browser. */
export function monitorEntry(saved: PairResponse | null, code: string) {
  return saved
    ? { kind: "resume" as const, device: saved, replacementCode: code || null }
    : { kind: "pair" as const, code };
}

/** A consumed pairing code should not remain in a bookmarked camera URL. */
export function withoutPairingCode(href: string) {
  const url = new URL(href);
  url.searchParams.delete("code");
  url.searchParams.delete("reconnect");
  return `${url.pathname}${url.search}${url.hash}`;
}
