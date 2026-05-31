import { LoginForm } from "./_components/LoginForm";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/locale";

export default async function LoginPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="glass w-full max-w-sm p-8 text-center">
        <div className="mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Banana Sheet Logo"
            className="h-16 w-16 object-contain rounded-2xl border border-[var(--glass-border)]/30 shadow-sm"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Banana Sheet</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Log expenses in a tap. See them beautifully.
        </p>
        <LoginForm dict={t.auth} />
      </div>
    </main>
  );
}
