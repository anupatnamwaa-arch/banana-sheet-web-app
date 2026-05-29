// Upgrade / Paywall — PromptPay QR (39 THB), promo code, slip upload.
// Reachable from Settings or when tapping a gated feature. Not a full-page block
// (freemium: free users still use the dashboard).
export default function PaywallPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="glass w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold">Unlock Banana Pro</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Analytics, Wealth, Budgets, Runway & unlimited insights.
        </p>

        <div className="mt-6 space-y-3 text-sm">
          <div className="rounded-2xl border border-[var(--glass-border)] p-4">Lifetime</div>
          <div className="rounded-2xl border border-[var(--glass-border)] p-4">Yearly</div>
          <div className="rounded-2xl border border-[var(--glass-border)] p-4">Monthly</div>
        </div>

        <p className="mt-6 text-xs text-fg-muted">
          QR + promo code + slip upload: TODO. Verified manually via Telegram.
        </p>
      </div>
    </main>
  );
}
