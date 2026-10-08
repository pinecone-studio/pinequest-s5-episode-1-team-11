import "server-only";
import { cookies } from "next/headers";

export async function hasSeenOnboarding() {
  return (await cookies()).get("halo-onboarding")?.value === "seen";
}
