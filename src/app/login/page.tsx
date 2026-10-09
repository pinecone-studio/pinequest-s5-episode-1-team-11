import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { AuthForm } from "@/features/auth/components/auth-form";
import { safeNext } from "@/lib/auth/redirect";
import { getUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (await getUser()) redirect("/home");
  const t = await getTranslations("auth");
  const params = await searchParams;
  return (
    <AppFrame width="narrow">
      <p className="font-display text-xl text-primary-text">Halo</p>
      <PageHeader title={t("login")} subtitle={t("welcome")} />
      <AuthForm
        mode="login"
        next={safeNext(params.next)}
        configured={isSupabaseConfigured}
        confirmationError={params.error === "confirmation"}
      />
    </AppFrame>
  );
}
