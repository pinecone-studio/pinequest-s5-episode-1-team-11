"use client";

import { ArrowLeftIcon, CheckCircleIcon, CopyIcon, LinkIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { DeviceKind } from "@/contracts";
import { formatPairingCode } from "@/contracts";
import { routes } from "@/lib/routes";
import { createDevicePairing, getPairingStatus } from "../actions";
import {
  type DeviceActionError,
  formatCountdown,
  type PairingDetails,
  pairingSecondsRemaining,
} from "../state";

export function PairingPanel({ demo }: { demo: boolean }) {
  const t = useTranslations("devices");
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [kind, setKind] = useState<DeviceKind>("phone");
  const [pairing, setPairing] = useState<PairingDetails | null>(null);
  const [phase, setPhase] = useState<"waiting" | "expired" | "paired">("waiting");
  const [deviceId, setDeviceId] = useState("");
  const [now, setNow] = useState(0);
  const [error, setError] = useState<DeviceActionError | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!pairing || phase !== "waiting") return;
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 1000);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const result = await getPairingStatus(pairing.code);
        if (cancelled) return;
        if (result.ok) {
          setError(null);
          setPhase(result.data.status);
          if (result.data.status === "paired") {
            setDeviceId(result.data.deviceId);
            router.refresh();
            return;
          }
          if (result.data.status === "expired") return;
        } else {
          setError(result.error);
          if (result.error === "unauthorized" || result.error === "notFound") return;
        }
      } catch {
        if (cancelled) return;
        setError("failed");
      }
      if (!pairingSecondsRemaining(pairing.expiresAt, Date.now())) {
        setPhase("expired");
        return;
      }
      timer = setTimeout(poll, 2000);
    };
    void poll();
    return () => {
      cancelled = true;
      clearInterval(clock);
      clearTimeout(timer);
    };
  }, [pairing, phase, router]);

  function create() {
    setError(null);
    setCopyMessage("");
    startTransition(async () => {
      try {
        const result = await createDevicePairing({ name, roomName, kind });
        if (!result.ok) return setError(result.error);
        setNow(Date.now());
        setPhase("waiting");
        setPairing(result.data);
      } catch {
        setError("failed");
      }
    });
  }

  async function copy() {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(pairing.monitorUrl);
      setCopyMessage(t("pairing.copied"));
    } catch {
      setCopyMessage(t("pairing.copyFailed"));
    }
  }

  const remaining = pairing ? pairingSecondsRemaining(pairing.expiresAt, now) : 0;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <section className="glass grid min-w-0 gap-6 rounded-lg p-5 sm:p-6">
        {demo && (
          <p className="rounded-md bg-warning/10 p-4 text-base text-warning-text">
            {t("demoNotice")}
          </p>
        )}
        {!pairing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              create();
            }}
            className="grid gap-6"
          >
            <fieldset disabled={pending || demo} className="grid min-w-0 gap-5">
              <Input
                label={t("fields.name")}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("fields.namePlaceholder")}
                required
                maxLength={60}
                autoComplete="off"
              />
              <Input
                label={t("fields.room")}
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder={t("fields.roomPlaceholder")}
                required
                maxLength={60}
                autoComplete="off"
              />
              <label className="grid gap-2 text-base font-bold text-muted-foreground">
                {t("fields.kind")}
                <select
                  value={kind}
                  onChange={(event) => setKind(event.target.value as DeviceKind)}
                  className="min-h-[52px] w-full rounded-md border border-input bg-card px-4 text-md font-normal text-foreground"
                >
                  {(["phone", "laptop", "ip_camera"] as const).map((value) => (
                    <option key={value} value={value}>
                      {t(`kinds.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              {kind === "ip_camera" && (
                <p className="text-sm text-muted-foreground">{t("pairing.cctv")}</p>
              )}
            </fieldset>
            {error && (
              <p role="alert" className="text-base text-destructive-text">
                {t(`errors.${error}`)}
              </p>
            )}
            <Button type="submit" block loading={pending} disabled={demo}>
              {t("pairing.create")}
            </Button>
          </form>
        ) : phase === "paired" ? (
          <div className="grid justify-items-center gap-4 py-4 text-center" role="status">
            <CheckCircleIcon
              weight="duotone"
              className="size-16 text-primary-text"
              aria-hidden="true"
            />
            <h2 className="text-xl font-bold">{t("pairing.successTitle")}</h2>
            <p className="max-w-sm text-base text-muted-foreground">
              {t("pairing.successBody", { name })}
            </p>
            <Button asChild block>
              <Link href={routes.device(deviceId)}>{t("pairing.openDevice")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid justify-items-center gap-5 text-center">
            <div className="grid gap-2">
              <h2 className="text-lg font-bold">
                {phase === "expired" ? t("pairing.expiredTitle") : t("pairing.scanTitle")}
              </h2>
              <p className="max-w-sm text-base text-muted-foreground">
                {phase === "expired" ? t("pairing.expiredBody") : t("pairing.scanBody")}
              </p>
            </div>
            {phase !== "expired" && remaining > 0 && (
              <Image
                src={pairing.qrDataUrl}
                alt={t("pairing.qrAlt")}
                width={240}
                height={240}
                unoptimized
                className="max-w-full rounded-md"
              />
            )}
            <div className="grid gap-2">
              <span className="text-sm text-muted-foreground">{t("pairing.code")}</span>
              <p className="tabular font-mono text-[36px] font-bold tracking-wider">
                {formatPairingCode(pairing.code)}
              </p>
              <p className="tabular text-base text-muted-foreground">
                {t("pairing.expires", { time: formatCountdown(remaining) })}
              </p>
            </div>
            {phase !== "expired" && (
              <div className="grid w-full gap-3">
                <p
                  role="status"
                  className="flex items-center justify-center gap-2 text-base text-muted-foreground"
                >
                  <Spinner />
                  {remaining > 0 ? t("pairing.waiting") : t("pairing.checking")}
                </p>
                <Button variant="secondary" block onClick={copy} disabled={!remaining}>
                  <CopyIcon aria-hidden="true" />
                  {t("pairing.copy")}
                </Button>
                {remaining > 0 && (
                  <a
                    href={pairing.monitorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center justify-center gap-2 text-base font-bold text-primary-text"
                  >
                    <LinkIcon aria-hidden="true" className="size-5" />
                    {t("pairing.openMonitor")}
                  </a>
                )}
                {copyMessage && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {copyMessage}
                  </p>
                )}
              </div>
            )}
            {error && (
              <p role="alert" className="text-base text-destructive-text">
                {t(`errors.${error}`)}
              </p>
            )}
            {(phase === "expired" || error === "notFound") && (
              <Button block onClick={create} loading={pending}>
                {t("pairing.regenerate")}
              </Button>
            )}
          </div>
        )}
      </section>
      <aside className="grid gap-4 rounded-lg border border-hairline p-5">
        <h2 className="text-md font-bold">{t("pairing.guideTitle")}</h2>
        <ol className="grid gap-4 text-base text-muted-foreground">
          <li>1. {t("pairing.step1")}</li>
          <li>2. {t("pairing.step2")}</li>
          <li>3. {t("pairing.step3")}</li>
        </ol>
        <Button asChild variant="ghost" block>
          <Link href={routes.devices}>
            <ArrowLeftIcon aria-hidden="true" />
            {t("back")}
          </Link>
        </Button>
      </aside>
    </div>
  );
}
