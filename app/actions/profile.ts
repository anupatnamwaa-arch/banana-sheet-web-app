// app/actions/profile.ts
"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Rotate the current user's api_key to a fresh UUID.
 * Returns the new key. Throws "Unauthenticated" if no session.
 */
export async function regenerateApiKey(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const newKey = crypto.randomUUID();

  const { error } = await supabase
    .from("profiles")
    .update({ api_key: newKey })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  return newKey;
}
