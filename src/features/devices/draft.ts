import type { Device } from "@/contracts";

export type DeviceDraft = Pick<Device, "name" | "roomName" | "settings">;
export type DeviceDraftState = { base: DeviceDraft; draft: DeviceDraft; conflict: boolean };

export function deviceDraft(device: DeviceDraft): DeviceDraft {
  return { name: device.name, roomName: device.roomName, settings: { ...device.settings } };
}

export function sameDraft(left: DeviceDraft, right: DeviceDraft) {
  return (
    left.name === right.name &&
    left.roomName === right.roomName &&
    left.settings.watching === right.settings.watching &&
    left.settings.sensitivity === right.settings.sensitivity &&
    left.settings.fall === right.settings.fall &&
    left.settings.distress === right.settings.distress &&
    left.settings.hazard === right.settings.hazard
  );
}

export function freshDeviceDraft(device: DeviceDraft): DeviceDraftState {
  const base = deviceDraft(device);
  return { base, draft: deviceDraft(base), conflict: false };
}

/** Refresh clean forms; keep edited values visible and flag concurrent changes for review. */
export function reconcileDeviceDraft(
  state: DeviceDraftState,
  incoming: DeviceDraft,
): DeviceDraftState {
  if (sameDraft(state.base, incoming))
    return state.conflict ? { ...state, conflict: false } : state;
  if (sameDraft(state.draft, state.base) || sameDraft(state.draft, incoming))
    return freshDeviceDraft(incoming);
  return state.conflict ? state : { ...state, conflict: true };
}
