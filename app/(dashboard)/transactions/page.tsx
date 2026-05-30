import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TransactionList } from "@/app/(dashboard)/analytics/_components/TransactionList";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <section className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">รายการ</h1>
      </header>
      <TransactionList userId={user.id} />
    </section>
  );
}
