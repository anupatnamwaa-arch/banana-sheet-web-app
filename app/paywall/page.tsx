// app/paywall/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/types";
import { PaywallClient } from "./_components/PaywallClient";

export const dynamic = "force-dynamic";

export default async function PaywallPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in, redirect to login page
  if (!user) {
    redirect("/login");
  }

  // 1. Fetch user's profile info
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, plan_type, plan_expires_at")
    .eq("id", user.id)
    .single();

  const isPro = profile ? isActive(profile) : false;

  // 2. Fetch the latest payment slip to track verification status (pending / rejected)
  const { data: latestSlip } = await supabase
    .from("payment_slips")
    .select("id, plan_type, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Serialize properties for safe RSC boundary passing
  const serializedSlip = latestSlip
    ? {
        id: latestSlip.id,
        plan_type: latestSlip.plan_type,
        status: latestSlip.status,
        created_at: new Date(latestSlip.created_at).toISOString(),
      }
    : null;

  return (
    <PaywallClient
      userId={user.id}
      userEmail={user.email || ""}
      initialIsPro={isPro}
      initialPlanType={profile?.plan_type ?? null}
      initialExpiresAt={profile?.plan_expires_at ? new Date(profile.plan_expires_at).toISOString() : null}
      initialPendingSlip={serializedSlip}
    />
  );
}
