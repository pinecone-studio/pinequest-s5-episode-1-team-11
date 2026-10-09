import { z } from "zod";
import { WatchedKind } from "@/contracts";

export const PersonInput = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  name: z.string().trim().min(1).max(60),
  kind: WatchedKind,
  age: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().int().min(0).max(130).nullable()),
  notes: z
    .string()
    .trim()
    .max(300)
    .transform((value) => value || null),
  emergencyPhone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => !value || (/^[+\d ()-]+$/.test(value) && /\d/.test(value)))
    .transform((value) => value || null),
});

export function personForm(form: FormData) {
  return PersonInput.safeParse({
    id: form.get("id") ?? "",
    name: form.get("name"),
    kind: form.get("kind"),
    age: form.get("age"),
    notes: form.get("notes"),
    emergencyPhone: form.get("emergencyPhone"),
  });
}
