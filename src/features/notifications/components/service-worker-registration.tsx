"use client";

import { useEffect } from "react";
import { registerNotificationWorker } from "../browser";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (window.isSecureContext && "serviceWorker" in navigator) {
      // Settings surfaces failures; registration alone must not prompt for permission.
      void registerNotificationWorker().catch(() => {});
    }
  }, []);
  return null;
}
