import { createClient } from "@/lib/supabase/server";
import { TransactionsView } from "./_components/TransactionsView";
import { getDevAuthBypassUserId } from "@/lib/dev-auth-bypass";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? await getDevAuthBypassUserId();

  return <TransactionsView userId={userId} />;
}
