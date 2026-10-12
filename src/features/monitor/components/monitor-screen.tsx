"use client";

import { CheckIcon, PlugIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PairResponse } from "@/contracts";
import { pairDevice, unpairDevice } from "../api";
import { forgetDevice, loadDevice, saveDevice } from "../device-store";
import { monitorEntry, withoutPairingCode } from "../entry";
import { cameraAllowed, enableCameraWake } from "../wake";
import { PairForm, type PairNotice } from "./pair-form";
import { WatchView } from "./watch-view";

/** undefined = not read yet, null = not paired, "local" = test mode without a server. */
type Identity = PairResponse | "local" | null | undefined;

export function MonitorScreen({
  code,
  apiReady,
  cctvUrl,
}: {
  code: string;
  apiReady: boolean;
  cctvUrl?: string;
}) {
  const t = useTranslations("monitor");
  const common = useTranslations("common");
  const [identity, setIdentity] = useState<Identity>(undefined);
  const [watching, setWatching] = useState(false);
  const [notice, setNotice] = useState<PairNotice>(null);
  const [replacementCode, setReplacementCode] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState(code);

  useEffect(() => {
    // A reconnect QR restores this camera here even if the phone forgot it, then starts watching.
    if (code && new URLSearchParams(window.location.search).has("reconnect")) {
      let cancelled = false;
      setIdentity(undefined);
      void pairDevice(code).then((result) => {
        if (cancelled) return;
        if (result.ok) {
          saveDevice(result.data);
          window.history.replaceState(
            window.history.state,
            "",
            withoutPairingCode(window.location.href),
          );
          setPairCode("");
          setReplacementCode(null);
          setIdentity(result.data);
          setWatching(true);
        } else {
          setIdentity(null);
          setPairCode(code);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    const entry = monitorEntry(loadDevice(), code);
    setIdentity(entry.kind === "resume" ? entry.device : null);
    setReplacementCode(entry.kind === "resume" ? entry.replacementCode : null);
    setPairCode(code);
    // A paired camera that was closed starts watching again on reopen (or from a wake
    // notification) without another tap, when the browser already allows the camera.
    if (entry.kind !== "resume" || entry.replacementCode) return;
    const fromWake = new URLSearchParams(window.location.search).has("resume");
    let cancelled = false;
    void cameraAllowed().then((allowed) => {
      if (!cancelled && (allowed || fromWake)) setWatching(true);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  function consumeCode() {
    window.history.replaceState(window.history.state, "", withoutPairingCode(window.location.href));
    setReplacementCode(null);
    setPairCode("");
  }

  function unpaired() {
    forgetDevice();
    setWatching(false);
    setNotice("removed");
    setIdentity(null);
    consumeCode();
  }

  if (watching && identity !== undefined && identity !== null) {
    return (
      <WatchView
        device={identity === "local" ? null : identity}
        cctvUrl={cctvUrl}
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
          initialCode={pairCode}
          notice={notice}
          apiReady={apiReady}
          onPaired={(device) => {
            saveDevice(device);
            consumeCode();
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
          {paired && <p className="text-base text-muted-foreground">{t("ready.reopen")}</p>}
          {paired && replacementCode && (
            <div className="glass grid gap-3 rounded-lg p-4">
              <p className="text-base text-muted-foreground">{t("ready.savedCode")}</p>
              <Button variant="secondary" onClick={() => setIdentity(null)}>
                {t("ready.useNewCode")}
              </Button>
            </div>
          )}
          {cctvUrl && (
            <p className="glass rounded-lg p-4 text-base">
              {t("ready.cctv", { host: new URL(cctvUrl).host })}
            </p>
          )}
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
            <Button
              size="lg"
              block
              onClick={() => {
                if (paired) void enableCameraWake(paired.deviceToken);
                consumeCode();
                setWatching(true);
              }}
            >
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
