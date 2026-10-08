"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export async function completeOnboarding() {
  (await cookies()).set("halo-onboarding", "seen", {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(routes.login);
}
