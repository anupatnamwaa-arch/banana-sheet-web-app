// Overview tab — period selector, hero metrics (Total Expense, Net Cash Flow,
// Net Saved, Saving Rate), Emergency Runway (Pro), Daily Pace (Pro).
// Data wiring + gating: next task.
export default function OverviewPage() {
  return (
    <section className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-fg-muted">This month</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass p-4">
          <p className="text-xs text-fg-muted">Total Expense</p>
          <p className="mt-1 text-xl font-semibold">฿0</p>
        </div>
        <div className="glass p-4">
          <p className="text-xs text-fg-muted">Net Cash Flow</p>
          <p className="mt-1 text-xl font-semibold">฿0</p>
        </div>
      </div>

      <div className="glass p-4 text-sm text-fg-muted">
        Emergency Runway & Daily Pace — Pro. TODO.
      </div>
    </section>
  );
}
