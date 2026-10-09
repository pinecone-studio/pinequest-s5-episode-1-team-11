import { DesktopIcon, DeviceMobileIcon, VideoCameraIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
export default async function Page() {
  const t = await getTranslations("marketing");
  return (
    <div className="grid gap-10">
      <PageHeader title={t("cameras")} subtitle={t("cameraGuide.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass grid content-start gap-5 rounded-lg p-6">
          <div className="flex gap-3 text-primary-text">
            <DeviceMobileIcon className="size-7" aria-hidden="true" />
            <DesktopIcon className="size-7" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold">{t("cameraGuide.browser.title")}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("cameraGuide.browser.body")}
          </p>
          <ol className="grid gap-4 text-base leading-relaxed">
            {(["step1", "step2", "step3"] as const).map((key, index) => (
              <li key={key} className="flex gap-3">
                <span className="tabular font-bold text-primary-text">{index + 1}.</span>
                <span>{t(`cameraGuide.browser.${key}`)}</span>
              </li>
            ))}
          </ol>
          <Button asChild block>
            <Link href={routes.newDevice}>{t("cameraGuide.add")}</Link>
          </Button>
          <Button asChild variant="secondary" block>
            <Link href={routes.monitor}>{t("hero.try")}</Link>
          </Button>
        </section>
        <section className="glass grid content-start gap-5 rounded-lg p-6">
          <VideoCameraIcon className="size-7 text-primary-text" aria-hidden="true" />
          <h2 className="text-xl font-bold">{t("cameraGuide.ip.title")}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("cameraGuide.ip.body")}
          </p>
          <ol className="grid gap-4 text-base leading-relaxed">
            {(["step1", "step2", "step3"] as const).map((key, index) => (
              <li key={key} className="flex gap-3">
                <span className="tabular font-bold text-primary-text">{index + 1}.</span>
                <span>{t(`cameraGuide.ip.${key}`)}</span>
              </li>
            ))}
          </ol>
          <p className="rounded-md border border-warning/25 bg-warning/5 p-4 text-base text-warning-text">
            {t("cameraGuide.ip.limit")}
          </p>
          <div className="grid gap-2 text-base text-primary-text">
            <a
              href="https://go2rtc.org/"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center underline underline-offset-4"
            >
              {t("cameraGuide.ip.relayDocs")}
            </a>
            <a
              href="https://www.tp-link.com/us/support/faq/2680/"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center underline underline-offset-4"
            >
              {t("cameraGuide.ip.vendorDocs")}
            </a>
            <a
              href="https://www.tp-link.com/us/support/faq/4465/"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center underline underline-offset-4"
            >
              {t("cameraGuide.ip.vendorModels")}
            </a>
          </div>
        </section>
      </div>
      <section className="grid max-w-3xl gap-4">
        <h2 className="text-lg font-bold">{t("cameraGuide.keepReady.title")}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          {t("cameraGuide.keepReady.body")}
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          {t("cameraGuide.keepReady.network")}
        </p>
        <Link
          href="/faq"
          className="flex min-h-11 items-center text-base font-bold text-primary-text"
        >
          {t("cameraGuide.questions")}
        </Link>
      </section>
    </div>
  );
}
