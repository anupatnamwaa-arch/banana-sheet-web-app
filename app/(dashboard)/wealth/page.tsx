import { createClient } from "@/lib/supabase/server";
import { getWealthData } from "@/app/actions/wealth-data";
import { WealthView } from "./_components/WealthView";

export default async function WealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  const data = await getWealthData(userId);

  return <WealthView data={data} />;
}
