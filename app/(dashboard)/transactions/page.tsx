import { createClient } from "@/lib/supabase/server";
import { TransactionsView } from "./_components/TransactionsView";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  return <TransactionsView userId={userId} />;
}
