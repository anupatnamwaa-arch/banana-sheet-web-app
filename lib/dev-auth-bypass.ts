import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export const DEV_AUTH_BYPASS_USER_ID =
  "00000000-0000-0000-0000-000000000000";

export function isDevAuthBypassEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_BYPASS === "true"
  );
}

export async function getDevAuthBypassDataClient() {
  return isDevAuthBypassEnabled()
    ? createServiceClient()
    : await createClient();
}

export const getDevAuthBypassUserId = cache(async () => {
  if (!isDevAuthBypassEnabled()) return DEV_AUTH_BYPASS_USER_ID;

  const email = process.env.DEV_AUTH_BYPASS_EMAIL?.trim().toLowerCase();
  if (!email) return DEV_AUTH_BYPASS_USER_ID;

  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase.auth.admin.listUsers();
  if (error) throw new Error(`Failed to load preview user: ${error.message}`);

  const previewUser = data.users.find(
    (user) => user.email?.toLowerCase() === email,
  );
  if (!previewUser) throw new Error(`Preview user not found: ${email}`);

  return previewUser.id;
});
