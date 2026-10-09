"use client";

import { CameraSlashIcon, LockKeyIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EventSnapshot({ url }: { url: string | null }) {
  const t = useTranslations("events.snapshot");
  const router = useRouter();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const unavailable = !url || url === failedUrl;
  return (
    <figure className="glass overflow-hidden rounded-2xl">
      <div className="relative grid aspect-video place-items-center bg-card">
        {unavailable ? (
          <div className="grid max-w-xs justify-items-center gap-3 p-6 text-center text-muted-foreground">
            <CameraSlashIcon aria-hidden="true" className="size-8" />
            <p className="text-sm">{t(url ? "expired" : "missing")}</p>
            {url && (
              <Button variant="secondary" onClick={() => router.refresh()}>
                {t("refresh")}
              </Button>
            )}
          </div>
        ) : (
          <Image
            src={url}
            alt={t("alt")}
            fill
            sizes="(min-width: 1024px) 600px, 100vw"
            unoptimized
            className="object-contain"
            onError={() => setFailedUrl(url)}
          />
        )}
      </div>
      <figcaption className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <LockKeyIcon aria-hidden="true" className="size-4 shrink-0" />
        {t("private")}
      </figcaption>
    </figure>
  );
}
