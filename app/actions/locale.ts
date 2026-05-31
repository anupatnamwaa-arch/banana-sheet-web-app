"use server";

import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

export async function setLocale(locale: Locale): Promise<void> {
  if (locale !== "th" && locale !== "en") {
    throw new Error("Unsupported locale");
  }

  const cookieStore = await cookies();
  cookieStore.set("bs-locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
