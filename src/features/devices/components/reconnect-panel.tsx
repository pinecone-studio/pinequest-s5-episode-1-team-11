"use client";

import { QrCodeIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatPairingCode } from "@/contracts";
import { createReconnectPairing, getPairingStatus } from "../actions";
import { formatCountdown, type PairingDetails, pairingSecondsRemaining } from "../state";

const POLL_MS = 2000;

/** Offline camera: a QR that brings this same camera back on the phone with one scan. */
export function ReconnectPanel({ deviceId }: { deviceId: string }) {
  const t = useTranslations("devices.offline.reconnect");
  const router = useRouter();
  const [pairing, setPairing] = useState<PairingDetails | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!pairing) return;
    const tick = () => setRemaining(pairingSecondsRemaining(pairing.expiresAt, Date.now()));
    tick();
    const clock = setInterval(tick, 1000);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One request at a time, and none once the code has expired.
    const poll = async () => {
      const result = await getPairingStatus(pairing.code).catch(() => null);
      if (cancelled) return;
      if (result?.ok && result.data.status === "paired") {
        setPairing(null);
        toast.success(t("done"));
        router.refresh();
        return;
      }
      if (result?.ok && result.data.status === "expired") return;
      if (!pairingSecondsRemaining(pairing.expiresAt, Date.now())) return;
      timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      cancelled = true;
      clearInterval(clock);
      clearTimeout(timer);
    };
  }, [pairing, router, t]);

  if (!pairing) {
    return (
      <div className="grid gap-2">
        <Button
          variant="secondary"
          className="w-fit"
          loading={pending}
          onClick={() =>
            start(async () => {
              const result = await createReconnectPairing(deviceId);
              if (result.ok) setPairing(result.data);
              else toast.error(t("failed"));
            })
          }
        >
          <QrCodeIcon aria-hidden="true" />
          {t("button")}
        </Button>
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
      </div>
    );
  }

  const expired = remaining <= 0;
  return (
    <div className="glass grid justify-items-center gap-4 rounded-lg p-5 text-center">
      <p className="max-w-sm text-base">{expired ? t("expired") : t("scan")}</p>
      {!expired && (
        <Image
          src={pairing.qrDataUrl}
          alt={t("qrAlt")}
          width={220}
          height={220}
          unoptimized
          className="max-w-full rounded-md"
        />
      )}
      <p className="tabular font-mono text-[30px] font-bold tracking-wider">
        {formatPairingCode(pairing.code)}
      </p>
      {expired ? (
        <Button
          variant="secondary"
          onClick={() =>
            start(async () => {
              const result = await createReconnectPairing(deviceId);
              if (result.ok) setPairing(result.data);
              else toast.error(t("failed"));
            })
          }
          loading={pending}
        >
          {t("again")}
        </Button>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner />
          {t("waiting", { time: formatCountdown(remaining) })}
        </p>
      )}
    </div>
  );
}
