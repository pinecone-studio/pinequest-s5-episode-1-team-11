import { ArrowRightIcon, BatteryChargingIcon, WifiHighIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CameraGuide } from "@/features/marketing/components/camera-guide";
import { PageIntro } from "@/features/marketing/components/page-intro";
import { routes } from "@/lib/routes";

const steps = ["step1", "step2", "step3"] as const;

export default async function Page() {
  const t = await getTranslations("marketing");
  return (
    <div className="grid gap-14">
      <PageIntro title={t("cameras")} lead={t("cameraGuide.subtitle")} />
      <CameraGuide
        switchLabel={t("cameras")}
        browser={{
          label: t("cameraGuide.browser.short"),
          title: t("cameraGuide.browser.title"),
          body: t("cameraGuide.browser.body"),
          steps: steps.map((key) => t(`cameraGuide.browser.${key}`)),
          actions: (
            <div className="mt-2 grid gap-3 sm:flex sm:flex-wrap">
              <Button asChild>
                <Link href={routes.newDevice}>
                  {t("cameraGuide.add")}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={routes.monitor}>{t("hero.try")}</Link>
              </Button>
            </div>
          ),
        }}
        ip={{
          label: t("cameraGuide.ip.short"),
          title: t("cameraGuide.ip.title"),
          body: t("cameraGuide.ip.body"),
          steps: steps.map((key) => t(`cameraGuide.ip.${key}`)),
          limit: t("cameraGuide.ip.limit"),
          links: [
            { href: "https://go2rtc.org/", label: t("cameraGuide.ip.relayDocs") },
            {
              href: "https://www.tp-link.com/us/support/faq/2680/",
              label: t("cameraGuide.ip.vendorDocs"),
            },
            {
              href: "https://www.tp-link.com/us/support/faq/4465/",
              label: t("cameraGuide.ip.vendorModels"),
            },
          ],
        }}
      />
      <section className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-12">
        <h2 className="font-display text-2xl">{t("cameraGuide.keepReady.title")}</h2>
        <div className="grid gap-5">
          <p className="flex gap-3 text-md leading-relaxed text-muted-foreground">
            <BatteryChargingIcon
              weight="duotone"
              className="mt-0.5 size-6 shrink-0 text-primary-text"
              aria-hidden="true"
            />
            {t("cameraGuide.keepReady.body")}
          </p>
          <p className="flex gap-3 text-md leading-relaxed text-muted-foreground">
            <WifiHighIcon
              weight="duotone"
              className="mt-0.5 size-6 shrink-0 text-primary-text"
              aria-hidden="true"
            />
            {t("cameraGuide.keepReady.network")}
          </p>
          <Link
            href="/faq"
            className="flex min-h-11 w-fit items-center gap-2 text-base font-bold text-primary-text underline-offset-4 hover:underline"
          >
            {t("cameraGuide.questions")}
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
