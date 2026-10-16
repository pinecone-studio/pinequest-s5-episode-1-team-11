"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { routes } from "@/lib/routes";
import { loadDevice } from "../device-store";

/** A phone paired as a camera has no account, so reopening Halo goes straight back to the camera. */
export function CameraResume() {
  const router = useRouter();
  useEffect(() => {
    if (loadDevice()) router.replace(routes.monitor);
  }, [router]);
  return null;
}
