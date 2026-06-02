import { createClient } from "@/lib/supabase/server";
import { getWealthData } from "@/app/actions/wealth-data";
import { WealthView } from "./_components/WealthView";
import { getDevAuthBypassUserId } from "@/lib/dev-auth-bypass";

export default async function WealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? await getDevAuthBypassUserId();

  const data = await getWealthData(userId);

  return <WealthView data={data} />;
}
