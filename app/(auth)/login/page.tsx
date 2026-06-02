import { LoginForm } from "./_components/LoginForm";
import {
  AtelierBrand,
  AtelierCard,
  AtelierShell,
} from "@/app/_components/atelier";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/locale";

export default async function LoginPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AtelierShell contentClassName="flex min-h-[calc(100dvh-3rem)] max-w-md items-center justify-center">
      <AtelierCard className="atelier-card-arrive w-full px-6 py-7 text-center sm:px-8 sm:py-8">
        <AtelierBrand
          subtitle={
            locale === "en"
              ? "Log expenses in a tap. See them beautifully."
              : "บันทึกรายจ่ายง่าย เห็นภาพการเงินชัดขึ้น"
          }
        />
        <LoginForm dict={t.auth} locale={locale} />
      </AtelierCard>
    </AtelierShell>
  );
}
