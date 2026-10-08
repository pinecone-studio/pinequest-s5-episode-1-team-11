import { DeviceConfig } from "@/contracts";
import { authenticateDevice, isDeviceApiConfigured } from "@/lib/device-api/auth";
import { apiError, apiJson } from "@/lib/device-api/http";

/** Authentication itself marks the device online; the answer carries its current settings. */
export async function POST(request: Request) {
  if (!isDeviceApiConfigured) return apiError(503, "not_configured");
  const device = await authenticateDevice(request);
  if (!device) return apiError(401, "unauthorized");
  return apiJson(
    DeviceConfig.parse({
      deviceId: device.id,
      name: device.name,
      roomName: device.room_name,
      settings: device.settings,
    }),
  );
}
