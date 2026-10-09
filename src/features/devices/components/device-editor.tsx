"use client";

import { CheckIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import type { DetectionSettings, Device } from "@/contracts";
import { routes } from "@/lib/routes";
import { deleteDevice, updateDevice } from "../actions";
import { type DeviceDraft, deviceDraft, freshDeviceDraft, reconcileDeviceDraft } from "../draft";
import type { DeviceActionError } from "../state";

export function DeviceEditor({ device, demo }: { device: Device; demo: boolean }) {
  const t = useTranslations("devices");
  const router = useRouter();
  const incoming = useMemo(
    () => deviceDraft({ name: device.name, roomName: device.roomName, settings: device.settings }),
    [device.name, device.roomName, device.settings],
  );
  const [editor, setEditor] = useState(() => freshDeviceDraft(incoming));
  const { name, roomName, settings } = editor.draft;
  const [error, setError] = useState<DeviceActionError | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const conflicted = editor.conflict || error === "conflict";

  useEffect(() => {
    setEditor((current) => reconcileDeviceDraft(current, incoming));
  }, [incoming]);

  function edit(next: Partial<DeviceDraft>) {
    setSaved(false);
    setEditor((current) => ({ ...current, draft: { ...current.draft, ...next } }));
  }

  function configure(next: Partial<DetectionSettings>) {
    setSaved(false);
    setEditor((current) => ({
      ...current,
      draft: { ...current.draft, settings: { ...current.draft.settings, ...next } },
    }));
  }

  function save() {
    if (conflicted) return setError("conflict");
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await updateDevice({
          id: device.id,
          name,
          roomName,
          settings,
          expected: editor.base,
        });
        if (!result.ok) {
          setError(result.error);
          if (result.error === "conflict") router.refresh();
          return;
        }
        setEditor(freshDeviceDraft({ name: name.trim(), roomName: roomName.trim(), settings }));
        setSaved(true);
        router.refresh();
      } catch {
        setError("failed");
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteDevice(device.id);
        if (!result.ok) return setError(result.error);
        router.push(routes.devices);
        router.refresh();
      } catch {
        setError("failed");
      }
    });
  }

  return (
    <div className="grid gap-6">
      {demo && (
        <p className="rounded-md bg-warning/10 p-4 text-base text-warning-text">
          {t("demoNotice")}
        </p>
      )}
      {conflicted && (
        <div
          role="alert"
          className="grid gap-3 rounded-md border border-warning/25 bg-warning/5 p-4"
        >
          <p className="text-base text-warning-text">{t("errors.conflict")}</p>
          <Button
            variant="secondary"
            block
            loading={pending}
            onClick={() =>
              startTransition(() => {
                setEditor(freshDeviceDraft(incoming));
                setError(null);
                setSaved(false);
                router.refresh();
              })
            }
          >
            {t("details.reload")}
          </Button>
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="grid gap-6"
      >
        <fieldset
          disabled={pending || demo || conflicted}
          className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start"
        >
          <section className="glass grid min-w-0 gap-5 rounded-lg p-5 sm:p-6">
            <h2 className="text-lg font-bold">{t("details.identity")}</h2>
            <Input
              label={t("fields.name")}
              value={name}
              required
              maxLength={60}
              onChange={(event) => {
                edit({ name: event.target.value });
              }}
            />
            <Input
              label={t("fields.room")}
              value={roomName}
              required
              maxLength={60}
              onChange={(event) => {
                edit({ roomName: event.target.value });
              }}
            />
            <p className="text-sm text-muted-foreground">{t("details.syncHint")}</p>
          </section>
          <section className="glass grid min-w-0 gap-6 rounded-lg p-5 sm:p-6">
            <fieldset className="grid gap-3">
              <legend className="mb-3 text-lg font-bold">{t("details.watching")}</legend>
              {(["elderly", "child", "disabled"] as const).map((value) => (
                <label
                  key={value}
                  className="flex min-h-16 cursor-pointer items-center gap-3 rounded-md border border-hairline p-4 has-checked:border-primary has-checked:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="watching"
                    value={value}
                    checked={settings.watching === value}
                    onChange={() => configure({ watching: value })}
                    className="size-5 shrink-0 accent-primary"
                  />
                  <span className="grid gap-1">
                    <span className="text-md font-bold">{t(`watching.${value}.label`)}</span>
                    <span className="text-sm text-muted-foreground">
                      {t(`watching.${value}.hint`)}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="grid gap-3">
              <h2 className="text-md font-bold">{t("details.sensitivity")}</h2>
              <SegmentedControl
                label={t("details.sensitivity")}
                value={settings.sensitivity}
                onValueChange={(sensitivity) => configure({ sensitivity })}
                options={(["low", "medium", "high"] as const).map((value) => ({
                  value,
                  label: t(`sensitivity.${value}`),
                }))}
              />
              <p className="text-sm text-muted-foreground">{t("details.sensitivityHint")}</p>
            </div>
            <div className="grid gap-4 border-t border-hairline pt-5">
              {(["fall", "distress", "hazard"] as const).map((key) => (
                <div key={key} className="flex min-h-16 items-center justify-between gap-4">
                  <label htmlFor={`detection-${key}`} className="grid cursor-pointer gap-1">
                    <span className="text-md font-bold">{t(`detection.${key}.label`)}</span>
                    <span className="text-sm text-muted-foreground">
                      {t(`detection.${key}.hint`)}
                    </span>
                  </label>
                  <Switch
                    id={`detection-${key}`}
                    checked={settings[key]}
                    onCheckedChange={(checked) => configure({ [key]: checked })}
                    disabled={pending || demo || conflicted}
                  />
                </div>
              ))}
            </div>
          </section>
        </fieldset>
        {error && error !== "conflict" && !confirmDelete && (
          <p role="alert" className="text-base text-destructive-text">
            {t(`errors.${error}`)}
          </p>
        )}
        {saved && (
          <p role="status" className="flex items-center gap-2 text-base text-primary-text">
            <CheckIcon aria-hidden="true" className="size-5" />
            {t("details.saved")}
          </p>
        )}
        <Button
          type="submit"
          block
          loading={pending && !confirmDelete}
          disabled={demo || pending || conflicted}
          className="lg:max-w-sm"
        >
          {t("details.save")}
        </Button>
      </form>
      <section className="grid gap-3 rounded-lg border border-destructive/25 p-5 lg:max-w-lg">
        <h2 className="text-md font-bold">{t("delete.title")}</h2>
        <p className="text-base text-muted-foreground">{t("delete.explanation")}</p>
        <Button
          variant="ghost"
          className="justify-start px-0 text-destructive-text"
          onClick={() => {
            setError(null);
            setConfirmDelete(true);
          }}
          disabled={demo || pending || conflicted}
        >
          <TrashIcon aria-hidden="true" />
          {t("delete.button")}
        </Button>
      </section>
      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!pending) setConfirmDelete(open);
        }}
        title={t("delete.confirmTitle")}
        description={t("delete.confirmBody", { name: device.name })}
        confirmLabel={t("delete.confirm")}
        cancelLabel={t("delete.cancel")}
        onConfirm={remove}
        loading={pending}
        confirmDisabled={demo}
      >
        {error && (
          <p role="alert" className="text-base text-destructive-text">
            {t(`errors.${error}`)}
          </p>
        )}
      </AlertDialog>
    </div>
  );
}
