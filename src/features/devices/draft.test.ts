import { describe, expect, it } from "vitest";
import { defaultDetectionSettings } from "@/contracts";
import { type DeviceDraft, freshDeviceDraft, reconcileDeviceDraft } from "./draft";

const original: DeviceDraft = {
  name: "Camera",
  roomName: "Room",
  settings: defaultDetectionSettings,
};
describe("camera drafts refreshed by another caregiver", () => {
  it("shows new settings in a clean form before the next rename", () => {
    const remote = { ...original, settings: { ...original.settings, hazard: false } };
    const refreshed = reconcileDeviceDraft(freshDeviceDraft(original), remote);
    expect(refreshed.draft.settings.hazard).toBe(false);
    expect(refreshed.base).toEqual(remote);
    expect(refreshed.conflict).toBe(false);
    const renamed = { ...refreshed.draft, name: "Nursery" };
    expect(renamed.settings.hazard).toBe(false);
  });

  it("blocks an old edited draft from silently replacing remote detection choices", () => {
    const local = { ...freshDeviceDraft(original), draft: { ...original, name: "Nursery" } };
    const remote = { ...original, settings: { ...original.settings, fall: false } };
    const conflicted = reconcileDeviceDraft(local, remote);
    expect(conflicted.conflict).toBe(true);
    expect(conflicted.draft.name).toBe("Nursery");
    expect(conflicted.base.settings.fall).toBe(true);
    const reviewed = freshDeviceDraft(remote);
    expect(reviewed.conflict).toBe(false);
    expect(reviewed.draft.settings.fall).toBe(false);
  });

  it("keeps edits during status-only updates and compares settings by meaning", () => {
    const local = { ...freshDeviceDraft(original), draft: { ...original, roomName: "Nursery" } };
    const reordered = {
      ...original,
      settings: {
        hazard: true,
        fall: true,
        distress: true,
        sensitivity: "medium" as const,
        watching: "elderly" as const,
      },
    };
    expect(reconcileDeviceDraft(local, reordered)).toBe(local);
  });

  it("recognizes its own successful normalized save without a false conflict", () => {
    const saved = { ...original, name: "Nursery" };
    expect(reconcileDeviceDraft(freshDeviceDraft(saved), saved).conflict).toBe(false);
  });
});
