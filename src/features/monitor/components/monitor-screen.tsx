"use client";

import { CheckIcon, PlugIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PairResponse } from "@/contracts";
import { unpairDevice } from "../api";
import { forgetDevice, loadDevice, saveDevice } from "../device-store";
import { PairForm, type PairNotice } from "./pair-form";
import { WatchView } from "./watch-view";

/** undefined = not read yet, null = not paired, "local" = test mode without a server. */
type Identity = PairResponse | "local" | null | undefined;

export function MonitorScreen({
  code,
  apiReady,
  testVideo,
}: {
  code: string;
  apiReady: boolean;
  testVideo?: string;
}) {
  const t = useTranslations("monitor");
  const common = useTranslations("common");
  const [identity, setIdentity] = useState<Identity>(undefined);
  const [watching, setWatching] = useState(false);
  const [notice, setNotice] = useState<PairNotice>(null);

  useEffect(() => {
    // A fresh code in the URL means the guardian wants to pair this browser again.
    setIdentity(code ? null : loadDevice());
  }, [code]);

  function unpaired() {
    forgetDevice();
    setWatching(false);
    setNotice("removed");
    setIdentity(null);
  }

  if (watching && identity !== undefined && identity !== null) {
    return (
      <WatchView
        device={identity === "local" ? null : identity}
        testVideo={testVideo}
        onExit={() => setWatching(false)}
        onUnpaired={unpaired}
      />
    );
  }

  const paired = identity && identity !== "local" ? identity : null;
  return (
    <AppFrame width="narrow">
      <PageHeader title={paired ? paired.roomName : t("title")} subtitle={t("subtitle")} />
      {identity === undefined ? (
        <Skeleton className="h-64" />
      ) : identity === null ? (
        <PairForm
          initialCode={code}
          notice={notice}
          apiReady={apiReady}
          onPaired={(device) => {
            saveDevice(device);
            setNotice(null);
            setIdentity(device);
          }}
          onLocal={() => setIdentity("local")}
        />
      ) : (
        <div className="grid gap-6">
          <p className="text-md text-muted-foreground">
            {paired ? t("ready.lead", { name: paired.name }) : t("ready.localLead")}
          </p>
          <ul className="glass grid gap-4 rounded-lg p-5">
            {[t("ready.tip1"), t("ready.tip2"), t("ready.tip3")].map((tip, index) => {
              const Icon = [VideoCameraIcon, PlugIcon, CheckIcon][index];
              return (
                <li key={tip} className="flex items-center gap-3 text-base">
                  <Icon aria-hidden="true" className="size-6 shrink-0 text-primary-text" />
                  {tip}
                </li>
              );
            })}
          </ul>
          <div className="grid gap-2">
            <Button size="lg" block onClick={() => setWatching(true)}>
              {t("ready.start")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">{t("ready.permission")}</p>
          </div>
          <Button
            variant="ghost"
            onClick={async () => {
              if (paired) await unpairDevice(paired.deviceToken);
              forgetDevice();
              setIdentity(null);
            }}
          >
            {paired ? t("ready.disconnect") : common("actions.back")}
          </Button>
        </div>
      )}
    </AppFrame>
  );
}
