import { getTranslations } from "next-intl/server";
import { StatusRing } from "@/components/domain/status-ring";
import { getHomeSummary } from "@/features/home/queries";

export default async function Page() {
  const t = await getTranslations("home");
  const summary = await getHomeSummary();

  const { profile, devices, watchedPeople, criticalEvent } = summary;

  const roomCount = devices.length;

  const state = criticalEvent ? "alert" : "calm";

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 p-4 md:p-8">
      {/* Мэндчилгээ */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">
          {t("greeting", {
            name: profile?.name ?? "Оюунаа",
          })}
        </h1>

        <p className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat("mn-MN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(new Date())}
        </p>
      </header>

      {/* Status Hero */}
      <section className="grid items-center gap-8 rounded-3xl border bg-card p-6 lg:grid-cols-2">
        <div className="flex justify-center">
          <StatusRing state={state}>
            <b>{String(roomCount).padStart(2, "0")}</b>
            <span>{t("rooms")}</span>
          </StatusRing>
        </div>

        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold">{t("calm")}</h2>

            <p className="mt-2 text-muted-foreground">
              {t("monitoringRooms", {
                count: roomCount,
              })}
            </p>
          </div>

          {/* 4 үзүүлэлт */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t("rooms"), value: roomCount },
              { label: t("devices"), value: devices.length },
              { label: t("people"), value: watchedPeople.length },
              {
                label: t("alerts"),
                value: criticalEvent ? 1 : 0,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border bg-background p-4">
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-primary">{t("systemNormal")}</p>
        </div>
      </section>
    </main>
  );
}
