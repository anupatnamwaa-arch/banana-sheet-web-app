import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { BottomNav } from "./_components/BottomNav";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <LanguageProvider locale={locale} dict={dict}>
      <div className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        {children}
        <BottomNav />
      </div>
    </LanguageProvider>
  );
}
