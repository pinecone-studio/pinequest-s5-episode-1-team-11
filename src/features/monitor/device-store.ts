import { PairResponse } from "@/contracts";

const KEY = "halo.device";

/** This browser's camera identity. Lives in localStorage: a monitor has no user session. */
export function loadDevice() {
  try {
    const parsed = PairResponse.safeParse(JSON.parse(localStorage.getItem(KEY) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveDevice(device: PairResponse) {
  try {
    localStorage.setItem(KEY, JSON.stringify(device));
  } catch {
    // Private mode: pairing still works until the tab closes.
  }
}

export function forgetDevice() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
