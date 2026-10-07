import { z } from "zod";
import { WatchedKind } from "./device";

export const Profile = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(60),
});
export type Profile = z.infer<typeof Profile>;

export const Household = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(60),
  ownerId: z.uuid(),
});
export type Household = z.infer<typeof Household>;

export const MemberRole = z.enum(["owner", "caregiver"]);
export type MemberRole = z.infer<typeof MemberRole>;

export const Member = z.object({
  userId: z.uuid(),
  name: z.string(),
  role: MemberRole,
  isMe: z.boolean(),
});
export type Member = z.infer<typeof Member>;

/** Someone the cameras watch over: a child, an elderly or a disabled person. */
export const WatchedPerson = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  name: z.string().trim().min(1).max(60),
  kind: WatchedKind,
  age: z.number().int().min(0).max(130).nullable(),
  /** Anything a helper should know, e.g. "зүрхний эм уудаг". */
  notes: z.string().max(300).nullable(),
  emergencyPhone: z.string().max(30).nullable(),
});
export type WatchedPerson = z.infer<typeof WatchedPerson>;

export const Invite = z.object({
  code: z.string().min(8),
  householdName: z.string(),
  invitedBy: z.string(),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type Invite = z.infer<typeof Invite>;
