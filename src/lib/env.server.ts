import "server-only";
import { z } from "zod";

const optional = z.string().trim().min(1).optional().catch(undefined);

/** Secrets. Importing this file from a client component fails the build. */
export const serverEnv = z
  .object({
    supabaseSecretKey: optional,
    vapidPrivateKey: optional,
    vapidSubject: z.string().startsWith("mailto:").catch("mailto:team@example.com"),
    /** Shared with the scheduler that calls /api/internal/*. At least 32 characters. */
    cronSecret: z.string().min(32).optional().catch(undefined),
    /** Signs CCTV live-view tokens; the same value is in the camera server's stream.env. */
    streamSecret: z.string().min(32).optional().catch(undefined),
    /** Camera server's HTTPS address, e.g. https://3-25-26-5.sslip.io */
    streamUrl: z.url().optional().catch(undefined),
  })
  .parse({
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidSubject: process.env.VAPID_SUBJECT,
    cronSecret: process.env.CRON_SECRET,
    streamSecret: process.env.STREAM_SECRET,
    streamUrl: process.env.STREAM_URL,
  });
