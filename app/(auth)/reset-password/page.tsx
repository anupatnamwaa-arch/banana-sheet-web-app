import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/locale";
import { ResetPasswordForm } from "./_components/ResetPasswordForm";

export default async function ResetPasswordPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <ResetPasswordForm dict={t.auth} common={t.common} locale={locale} />
  );
}
