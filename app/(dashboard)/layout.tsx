import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "./_components/BottomNav";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      {children}
      <BottomNav />
    </div>
  );
}
