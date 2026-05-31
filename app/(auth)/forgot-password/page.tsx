import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/locale";
import { ForgotPasswordForm } from "./_components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <ForgotPasswordForm dict={t.auth} common={t.common} locale={locale} />
  );
}
