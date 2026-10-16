import { ArrowLeftIcon, VideoCameraIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/features/auth/components/auth-form";
import { CameraResume } from "@/features/monitor/components/camera-resume";
import { safeNext } from "@/lib/auth/redirect";
import { getUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (await getUser()) redirect("/home");
  const [t, common] = await Promise.all([getTranslations("auth"), getTranslations("common")]);
  const params = await searchParams;
  return (
    <AppFrame width="narrow">
      <CameraResume />
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href="/">
          <ArrowLeftIcon aria-hidden="true" />
          {common("actions.back")}
        </Link>
      </Button>
      <p className="font-display text-xl text-primary-text">Halo</p>
      <PageHeader title={t("login")} subtitle={t("welcome")} />
      <AuthForm
        mode="login"
        next={safeNext(params.next)}
        configured={isSupabaseConfigured}
        confirmationError={params.error === "confirmation"}
      />
      <div className="grid gap-2 border-t border-hairline pt-6">
        <Button asChild variant="secondary" block>
          <Link href={routes.monitor}>
            <VideoCameraIcon aria-hidden="true" />
            {t("cameraMode")}
          </Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">{t("cameraModeHint")}</p>
      </div>
    </AppFrame>
  );
}
