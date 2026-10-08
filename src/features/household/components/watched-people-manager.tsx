"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ListGroup, ListItem } from "@/components/ui/list";
import { Sheet } from "@/components/ui/sheet";
import type { WatchedPerson } from "@/contracts";
import { WatchedPersonForm } from "./watched-person-form";

export function WatchedPeopleManager({ people }: { people: WatchedPerson[] }) {
  const t = useTranslations("household");
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  const finishEditing = useCallback(() => {
    setOpenId(null);
    router.refresh();
  }, [router]);

  function details(person: WatchedPerson) {
    return [
      t(`kinds.${person.kind}`),
      person.age === null ? null : t("ageValue", { age: person.age }),
      person.notes,
      person.emergencyPhone ? t("emergencyPhoneValue", { phone: person.emergencyPhone }) : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" · ");
  }

  return (
    <div className="grid gap-5">
      <Sheet
        open={openId === "new"}
        onOpenChange={(open) => setOpenId(open ? "new" : null)}
        trigger={<Button block>{t("addPerson")}</Button>}
        title={t("addPerson")}
        description={t("personFormHint")}
      >
        <WatchedPersonForm
          key={`new-${openId === "new"}`}
          person={null}
          onCancel={() => setOpenId(null)}
          onSaved={finishEditing}
        />
      </Sheet>

      {people.length ? (
        <ListGroup title={t("peopleTitle")}>
          {people.map((person) => (
            <Sheet
              key={person.id}
              open={openId === person.id}
              onOpenChange={(open) => setOpenId(open ? person.id : null)}
              trigger={
                <ListItem
                  leading={<Avatar name={person.name} />}
                  title={person.name}
                  description={details(person)}
                />
              }
              title={t("editPerson")}
              description={t("personFormHint")}
            >
              <WatchedPersonForm
                key={`${person.id}-${openId === person.id}`}
                person={person}
                onCancel={() => setOpenId(null)}
                onSaved={finishEditing}
              />
            </Sheet>
          ))}
        </ListGroup>
      ) : (
        <p className="glass rounded-lg p-4 text-sm text-muted-foreground">{t("emptyPeople")}</p>
      )}
    </div>
  );
}
