import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Free users get the dashboard too (freemium); per-feature gating happens there.
  redirect(user ? "/overview" : "/login");
}
