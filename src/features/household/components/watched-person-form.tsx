"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WatchedPerson } from "@/contracts";
import { type SaveWatchedPersonState, saveWatchedPerson } from "../watched-people-actions";

export function WatchedPersonForm({
  person,
  onCancel,
  onSaved,
}: {
  person: WatchedPerson | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("household");
  const [state, action, pending] = useActionState<SaveWatchedPersonState, FormData>(
    saveWatchedPerson,
    {},
  );

  useEffect(() => {
    if (state.saved) onSaved();
  }, [state.saved, onSaved]);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={person?.id ?? ""} />

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive-text">
          {state.error}
        </p>
      )}

      <Input
        name="name"
        label={t("personName")}
        defaultValue={person?.name ?? ""}
        maxLength={60}
        required
        error={state.fields?.name}
      />

      <div className="grid gap-2">
        <label htmlFor="person-kind" className="pl-1 text-base font-bold text-muted-foreground">
          {t("personKind")}
        </label>
        <select
          id="person-kind"
          name="kind"
          defaultValue={person?.kind ?? "elderly"}
          className="glass min-h-[52px] w-full rounded-md px-4 text-md text-foreground"
        >
          <option value="child">{t("kinds.child")}</option>
          <option value="elderly">{t("kinds.elderly")}</option>
          <option value="disabled">{t("kinds.disabled")}</option>
        </select>
      </div>

      <Input
        name="age"
        type="number"
        label={t("age")}
        defaultValue={person?.age ?? ""}
        min={0}
        max={130}
        step={1}
      />

      <div className="grid gap-2">
        <label htmlFor="person-notes" className="pl-1 text-base font-bold text-muted-foreground">
          {t("specialNotes")}
        </label>
        <textarea
          id="person-notes"
          name="notes"
          defaultValue={person?.notes ?? ""}
          maxLength={300}
          rows={3}
          className="glass w-full rounded-md px-4 py-3 text-md text-foreground"
        />
      </div>

      <Input
        name="emergencyPhone"
        type="tel"
        label={t("emergencyPhone")}
        defaultValue={person?.emergencyPhone ?? ""}
        maxLength={30}
        autoComplete="tel"
      />

      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={pending}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
