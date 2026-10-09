"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error?: string; deleted?: boolean };
type Client = NonNullable<Awaited<ReturnType<typeof createClient>>>;

const SNAPSHOT_BUCKET = "event-snapshots";

/** Removes every stored snapshot of the household through the Storage API (files live outside Postgres). */
async function removeHouseholdSnapshots(client: Client, householdId: string) {
  const bucket = client.storage.from(SNAPSHOT_BUCKET);
  for (let round = 0; round < 50; round++) {
    const { data, error } = await bucket.list(householdId, { limit: 100 });
    if (error) return false;
    if (!data.length) return true;
    const removed = await bucket.remove(data.map((file) => `${householdId}/${file.name}`));
    if (removed.error) return false;
  }
  return false;
}

/**
 * Caregivers are removed directly. A sole owner first revokes the household's cameras, removes
 * snapshots, then deletes; an owner with caregivers must hand ownership over first.
 */
export async function deleteAccount(
  _previous: AccountState,
  form: FormData,
): Promise<AccountState> {
  const t = await getTranslations("settings");
  if (form.get("confirmation") !== "DELETE") return { error: t("deleteConfirmError") };
  const client = await createClient();
  if (!client) return { error: t("accountDemo") };
  await requireUser();
  const cleanup = await client.rpc("begin_account_cleanup");
  if (cleanup.error) {
    if (cleanup.error.message.includes("Transfer household ownership"))
      return { error: t("deleteOwnerError") };
    if (!cleanup.error.message.includes("Owner access required"))
      return { error: t("accountError") };
  } else if (cleanup.data) {
    if (!(await removeHouseholdSnapshots(client, cleanup.data)))
      return { error: t("deleteSnapshotsError") };
    const finished = await client.rpc("finish_account_cleanup");
    if (finished.error) return { error: t("deleteSnapshotsError") };
  }
  const { error } = await client.rpc("delete_my_account");
  if (error) {
    if (error.message.includes("Transfer household ownership"))
      return { error: t("deleteOwnerError") };
    if (error.message.includes("Remove household snapshots"))
      return { error: t("deleteSnapshotsError") };
    return { error: t("accountError") };
  }
  await client.auth.signOut({ scope: "local" });
  return { deleted: true };
}

export type TransferState = { error?: string; done?: boolean };

/** Owner hands the household to an existing caregiver, e.g. before leaving. */
export async function transferOwnership(
  _previous: TransferState,
  form: FormData,
): Promise<TransferState> {
  const t = await getTranslations("settings");
  const target = z.uuid().safeParse(form.get("userId"));
  if (!target.success) return { error: t("transferError") };
  const client = await createClient();
  if (!client) return { error: t("accountDemo") };
  await requireUser();
  const { error } = await client.rpc("transfer_household_ownership", { p_new_owner: target.data });
  if (error) return { error: t("transferError") };
  revalidatePath(routes.household);
  revalidatePath(routes.settings);
  return { done: true };
}
