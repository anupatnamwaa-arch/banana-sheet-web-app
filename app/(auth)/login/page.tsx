// Auth screen — Google OAuth (primary) + email/password fallback.
// Wiring of the actual Supabase auth calls comes in the auth task; this is the shell.
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="glass w-full max-w-sm p-8 text-center">
        <div className="mb-2 text-4xl">🍌</div>
        <h1 className="text-2xl font-semibold tracking-tight">Banana Sheet</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Log expenses in a tap. See them beautifully.
        </p>

        <div className="mt-8 space-y-3">
          <button className="w-full rounded-2xl bg-white py-3 font-medium text-black">
            Continue with Google
          </button>
          <button className="w-full rounded-2xl border border-[var(--glass-border)] py-3 font-medium">
            Continue with email
          </button>
        </div>
        <p className="mt-6 text-xs text-fg-muted">Auth wiring: TODO</p>
      </div>
    </main>
  );
}
