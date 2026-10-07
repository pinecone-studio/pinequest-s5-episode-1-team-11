import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { createTestEvent, setDemoScenario, setDeviceOffline } from "@/features/devtools/actions";
import { DEMO_COOKIE, demoStates } from "@/lib/data/demo";
import { getHomeSummary } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { routes } from "@/lib/routes";

export default async function DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const [t, common, summary] = await Promise.all([
    getTranslations("devtools"),
    getTranslations("common"),
    getHomeSummary(),
  ]);
  const scenario = (await cookies()).get(DEMO_COOKIE)?.value ?? "calm";
  return (
    <AppFrame>
      <PageHeader
        title={t("title")}
        subtitle={isSupabaseConfigured ? t("connected") : common("demo")}
      />
      {!isSupabaseConfigured && (
        <form action={setDemoScenario} className="grid grid-cols-2 gap-3">
          {demoStates.map((state) => (
            <Button
              key={state}
              type="submit"
              name="scenario"
              value={state}
              variant={scenario === state ? "primary" : "secondary"}
              aria-pressed={scenario === state}
            >
              {t(`scenario.${state}`)}
            </Button>
          ))}
        </form>
      )}
      {isSupabaseConfigured && serverEnv.supabaseSecretKey && (
        <>
          <form action={createTestEvent}>
            <Button type="submit">{t("createEvent")}</Button>
          </form>
          {summary.devices.map((device) => (
            <form key={device.id} action={setDeviceOffline}>
              <input type="hidden" name="deviceId" value={device.id} />
              <Button type="submit" variant="secondary">
                {t("offlineDevice", { name: device.name })}
              </Button>
            </form>
          ))}
        </>
      )}
      <nav className="flex flex-wrap gap-3" aria-label={t("routes")}>
        {[
          routes.home,
          routes.events,
          routes.devices,
          routes.newDevice,
          routes.settings,
          routes.household,
          routes.people,
          routes.monitor,
          routes.design,
          routes.login,
          routes.signup,
          "/onboarding",
          "/privacy",
          "/faq",
          "/cameras",
        ].map((path) => (
          <Link key={path} href={path} className="grid min-h-11 place-items-center underline">
            {path}
          </Link>
        ))}
        {summary.events[0] && (
          <Link
            className="grid min-h-11 place-items-center underline"
            href={routes.alert(summary.events[0].id)}
          >
            /events/[id]/alert
          </Link>
        )}
      </nav>
      <p>
        {t("summary", {
          devices: summary.devices.length,
          events: summary.events.length,
          unread: summary.unreadCount,
        })}
      </p>
      <details className="min-w-0">
        <summary className="cursor-pointer py-3">{t("data")}</summary>
        <pre className="max-w-full overflow-auto rounded-lg bg-hairline p-4 text-xs">
          {JSON.stringify(summary, null, 2)}
        </pre>
      </details>
    </AppFrame>
  );
}
