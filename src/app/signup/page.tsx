import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/features/auth/components/auth-form";
import { safeNext } from "@/lib/auth/redirect";
import { getUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

export default async function SignUp({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getUser()) redirect("/home");
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  const params = await searchParams;
  return (
    <AppFrame width="narrow">
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href="/">
          <ArrowLeftIcon aria-hidden="true" />
          {common("actions.back")}
        </Link>
      </Button>
      <p className="font-display text-xl text-primary-text">Halo</p>
      <PageHeader title={t("signup")} subtitle={t("welcome")} />
      <AuthForm mode="signup" next={safeNext(params.next)} configured={isSupabaseConfigured} />
    </AppFrame>
  );
}
