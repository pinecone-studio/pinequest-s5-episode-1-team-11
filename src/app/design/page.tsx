import { cookies } from "next/headers";
import { getNow } from "next-intl/server";
import { defaultPalette, isPalette, PALETTE_COOKIE } from "@/components/theme/palettes";
import { makeFixtures } from "@/contracts/fixtures";
import { DesignShowcase } from "@/features/design/components/design-showcase";

export default async function DesignPage() {
  const saved = (await cookies()).get(PALETTE_COOKIE)?.value;
  const fixtures = makeFixtures(await getNow());
  return <DesignShowcase palette={isPalette(saved) ? saved : defaultPalette} fixtures={fixtures} />;
}
