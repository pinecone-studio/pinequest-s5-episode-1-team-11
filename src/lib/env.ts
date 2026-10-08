import { z } from "zod";

const optional = z.string().trim().min(1).optional().catch(undefined);

const publicSchema = z.object({
  siteUrl: z.url().catch("http://localhost:3000"),
  supabaseUrl: z.url().optional().catch(undefined),
  supabasePublishableKey: optional,
  vapidPublicKey: optional,
});

/** Browser-safe settings. Next.js inlines NEXT_PUBLIC_* at build time, so each is read by name. */
export const publicEnv = publicSchema.parse({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});

/** True when .env.local points at a Supabase project. Otherwise queries return example data. */
export const isSupabaseConfigured = Boolean(
  publicEnv.supabaseUrl && publicEnv.supabasePublishableKey,
);
