import { MonitorScreen } from "@/features/monitor/components/monitor-screen";
import { isDeviceApiConfigured } from "@/lib/device-api/auth";

export default async function Page({ searchParams }: PageProps<"/monitor">) {
  const { code, video } = await searchParams;
  const value = typeof code === "string" && /^\d{6}$/.test(code) ? code : "";
  // Development: /monitor?video=/clips/fall.mp4 replays a same-origin recording.
  const testVideo =
    process.env.NODE_ENV === "development" &&
    typeof video === "string" &&
    /^\/[\w\-./]+$/.test(video)
      ? video
      : undefined;
  return <MonitorScreen code={value} apiReady={isDeviceApiConfigured} testVideo={testVideo} />;
}
