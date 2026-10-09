import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
export default async function Page() {
  const t = await getTranslations("marketing");
  return (
    <div className="grid max-w-3xl gap-8">
      <PageHeader title={t("faq")} subtitle={t("faqContent.subtitle")} />
      <Accordion
        items={(
          [
            "devices",
            "internet",
            "background",
            "data",
            "push",
            "accuracy",
            "cctv",
            "removal",
          ] as const
        ).map((id) => ({
          id,
          title: t(`faqContent.${id}.question`),
          content: <p className="leading-relaxed">{t(`faqContent.${id}.answer`)}</p>,
        }))}
      />
      <Button asChild variant="secondary" className="w-fit">
        <Link href="/cameras">{t("closing.guide")}</Link>
      </Button>
    </div>
  );
}
