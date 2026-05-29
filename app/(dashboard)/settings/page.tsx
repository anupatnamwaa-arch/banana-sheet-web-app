import { CsvExportButton } from "./_components/CsvExportButton";
import { CsvImportDrawer } from "./_components/CsvImportDrawer";

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">ตั้งค่า</h1>
      </header>

      {/* Data portability */}
      <div className="glass p-5 space-y-3">
        <p className="text-sm font-medium text-fg-muted">ข้อมูล</p>
        <CsvExportButton />
        <CsvImportDrawer />
      </div>

      {/* Placeholders for remaining settings sections (future tasks) */}
      <div className="glass p-5 text-sm text-fg-muted">
        API Key + Regenerate — TODO (Task: Settings)
      </div>
      <div className="glass p-5 text-sm text-fg-muted">
        งบประมาณรายหมวดหมู่ — TODO (Task: Budgets)
      </div>
      <div className="glass p-5 text-sm text-fg-muted">
        แผนการใช้งาน — TODO (Task: Paywall)
      </div>
    </section>
  );
}
