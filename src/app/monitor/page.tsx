import { MonitorScreen } from "@/features/monitor/components/monitor-screen";
import { isDeviceApiConfigured } from "@/lib/device-api/auth";

export default async function Page({ searchParams }: PageProps<"/monitor">) {
  const { code } = await searchParams;
  const value = typeof code === "string" && /^\d{6}$/.test(code) ? code : "";
  return <MonitorScreen code={value} apiReady={isDeviceApiConfigured} />;
}
