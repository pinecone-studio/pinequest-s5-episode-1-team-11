import { ArrowRightIcon, VideoCameraIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/features/marketing/components/page-intro";

const questions = [
  "devices",
  "internet",
  "background",
  "data",
  "push",
  "accuracy",
  "cctv",
  "removal",
] as const;

export default async function Page() {
  const t = await getTranslations("marketing");
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
      <div className="grid content-start gap-8 lg:sticky lg:top-28 lg:self-start">
        <PageIntro title={t("faq")} lead={t("faqContent.subtitle")} />
        <div className="glass grid gap-4 rounded-xl p-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary-text">
            <VideoCameraIcon weight="duotone" className="size-6" aria-hidden="true" />
          </span>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("cameraGuide.subtitle")}
          </p>
          <Button asChild variant="secondary" className="w-fit">
            <Link href="/cameras">
              {t("closing.guide")}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
      <Accordion
        className="self-start rounded-xl [&_button]:min-h-16 [&_button]:px-5 [&_button]:text-lg [&_[role=region]]:px-5 [&_[role=region]]:pb-5"
        items={questions.map((id) => ({
          id,
          title: t(`faqContent.${id}.question`),
          content: (
            <p className="max-w-[65ch] text-md leading-relaxed">{t(`faqContent.${id}.answer`)}</p>
          ),
        }))}
      />
    </div>
  );
}
