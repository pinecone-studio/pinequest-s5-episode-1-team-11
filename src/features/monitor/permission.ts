"use client";

/** Reopening a paired camera should not need another tap when the browser already allows it. */
export async function cameraAllowed(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    return status.state === "granted";
  } catch {
    return false;
  }
}
