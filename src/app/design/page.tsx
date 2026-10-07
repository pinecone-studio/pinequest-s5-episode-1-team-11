import { cookies } from "next/headers";
import { defaultPalette, isPalette, PALETTE_COOKIE } from "@/components/theme/palettes";
import { DesignShowcase } from "@/features/design/components/design-showcase";

export default async function DesignPage() {
  const saved = (await cookies()).get(PALETTE_COOKIE)?.value;
  return <DesignShowcase palette={isPalette(saved) ? saved : defaultPalette} />;
}
