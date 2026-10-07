import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { PageHeader } from "./page-header";

/** A working route and data seam, ready for its feature owner to replace. */
export async function FeaturePlaceholder({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const t = await getTranslations("common");
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      {children}
      <p className="text-sm text-muted-foreground">{t("featurePending")}</p>
    </>
  );
}
