"use client";

import { PencilSimpleIcon, PlusIcon, TrashIcon, UsersIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { WatchedPerson } from "@/contracts";
import { removeWatchedPerson, saveWatchedPerson } from "../people-actions";

function PersonEditor({
  person,
  demo,
  onClose,
}: {
  person?: WatchedPerson;
  demo: boolean;
  onClose(): void;
}) {
  const t = useTranslations("household");
  const common = useTranslations("common.actions");
  const [state, action, pending] = useActionState(saveWatchedPerson, {});
  useEffect(() => {
    if (!state.success) return;
    toast.success(state.success);
    onClose();
  }, [state.success, onClose]);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={person?.id ?? ""} />
      <Input
        name="name"
        label={t("personName")}
        defaultValue={person?.name}
        maxLength={60}
        required
      />
      <label className="grid gap-2">
        <span className="pl-1 text-base font-bold text-muted-foreground">{t("personKind")}</span>
        <select
          name="kind"
          defaultValue={person?.kind ?? "elderly"}
          className="glass min-h-[52px] w-full rounded-md px-4 text-md"
        >
          <option value="child">{t("kindChild")}</option>
          <option value="elderly">{t("kindElderly")}</option>
          <option value="disabled">{t("kindDisabled")}</option>
        </select>
      </label>
      <Input
        name="age"
        type="number"
        min={0}
        max={130}
        step={1}
        label={t("personAge")}
        defaultValue={person?.age ?? ""}
      />
      <Input
        name="emergencyPhone"
        type="tel"
        label={t("personPhone")}
        defaultValue={person?.emergencyPhone ?? ""}
        maxLength={30}
      />
      <label className="grid gap-2">
        <span className="pl-1 text-base font-bold text-muted-foreground">{t("personNotes")}</span>
        <textarea
          name="notes"
          defaultValue={person?.notes ?? ""}
          maxLength={300}
          rows={3}
          className="glass w-full resize-y rounded-md px-4 py-3 text-base"
        />
      </label>
      {demo && <p className="text-sm text-muted-foreground">{t("personDemo")}</p>}
      {state.error && (
        <p role="alert" className="text-sm text-destructive-text">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary-text">
          {state.success}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onClose}>
          {common("cancel")}
        </Button>
        <Button type="submit" loading={pending} disabled={demo}>
          {common("save")}
        </Button>
      </div>
    </form>
  );
}

function PersonCard({ person, demo }: { person: WatchedPerson; demo: boolean }) {
  const t = useTranslations("household");
  const common = useTranslations("common.actions");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const kinds = { child: "kindChild", elderly: "kindElderly", disabled: "kindDisabled" } as const;
  return (
    <article className="glass grid gap-4 rounded-lg p-5">
      <div className="flex items-center gap-3">
        <Avatar name={person.name} />
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-md font-bold">{person.name}</h2>
          <p className="text-sm text-muted-foreground">
            {t(kinds[person.kind])}
            {person.age !== null && ` · ${t("personYears", { age: person.age })}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          aria-label={t("editPerson", { name: person.name })}
          aria-expanded={editing}
          className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-hairline"
        >
          <PencilSimpleIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
      {editing ? (
        <PersonEditor person={person} demo={demo} onClose={() => setEditing(false)} />
      ) : (
        <>
          {person.notes && (
            <p className="whitespace-pre-wrap break-words text-base text-muted-foreground">
              {person.notes}
            </p>
          )}
          {person.emergencyPhone && (
            <a
              href={`tel:${person.emergencyPhone.replace(/[^+\d]/g, "")}`}
              className="min-h-11 content-center text-base font-bold text-primary-text"
            >
              {t("personPhone")}: {person.emergencyPhone}
            </a>
          )}
        </>
      )}
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title={t("removePersonTitle", { name: person.name })}
        description={t("removePersonHint")}
        confirmLabel={common("delete")}
        cancelLabel={common("cancel")}
        loading={pending}
        confirmDisabled={demo}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            disabled={demo}
            className="justify-self-start text-destructive-text"
          >
            <TrashIcon aria-hidden="true" />
            {common("delete")}
          </Button>
        }
        onConfirm={() =>
          startTransition(async () => {
            setError("");
            const form = new FormData();
            form.set("id", person.id);
            try {
              const result = await removeWatchedPerson({}, form);
              if (result.error) setError(result.error);
              else {
                setOpen(false);
                router.refresh();
              }
            } catch {
              setError(t("personUnavailable"));
            }
          })
        }
      >
        {error && (
          <p role="alert" className="text-sm text-destructive-text">
            {error}
          </p>
        )}
      </AlertDialog>
    </article>
  );
}

export function PeoplePanel({ people, demo }: { people: WatchedPerson[]; demo: boolean }) {
  const t = useTranslations("household");
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-6">
      <Button
        onClick={() => setAdding(!adding)}
        className="justify-self-start"
        aria-expanded={adding}
      >
        <PlusIcon aria-hidden="true" />
        {t("addPerson")}
      </Button>
      {adding && (
        <section className="glass grid max-w-lg gap-4 rounded-lg p-5">
          <h2 className="text-md font-bold">{t("addPerson")}</h2>
          <PersonEditor demo={demo} onClose={() => setAdding(false)} />
        </section>
      )}
      {people.length ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} demo={demo} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<UsersIcon />}
          title={t("peopleEmpty")}
          description={t("peopleEmptyHint")}
        />
      )}
    </div>
  );
}
