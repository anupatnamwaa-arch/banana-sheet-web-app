import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "./index";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const val = cookieStore.get("bs-locale")?.value;
  return val === "en" ? "en" : "th";
}
