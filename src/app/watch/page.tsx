import type { Metadata } from "next";
import { CameraWatch } from "@/features/live/components/camera-watch";

export const metadata: Metadata = { robots: { index: false } };

/** Full-screen CCTV view for the mobile app's WebView; the app passes a short-lived token. */
export default function Page() {
  return <CameraWatch />;
}
