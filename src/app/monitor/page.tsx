import { MonitorScreen } from "@/features/monitor/components/monitor-screen";
import { isDeviceApiConfigured } from "@/lib/device-api/auth";

export default async function Page({ searchParams }: PageProps<"/monitor">) {
  const { code, cctv } = await searchParams;
  const value = typeof code === "string" && /^\d{6}$/.test(code) ? code : "";
  // CCTV: /monitor?cctv=http://localhost:1984/api/webrtc?src=hall (go2rtc, see tools/cctv-sim).
  const cctvUrl =
    typeof cctv === "string" && /^https?:\/\/[^\s]+\/api\/webrtc\?src=[\w-]+$/.test(cctv)
      ? cctv
      : undefined;
  return <MonitorScreen code={value} apiReady={isDeviceApiConfigured} cctvUrl={cctvUrl} />;
}
