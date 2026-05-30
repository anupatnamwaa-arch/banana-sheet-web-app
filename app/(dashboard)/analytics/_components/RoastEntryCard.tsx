import Link from "next/link";

export function RoastEntryCard() {
  return (
    <Link
      href="/roast"
      className="relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4 transition-opacity hover:opacity-90"
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: "linear-gradient(90deg,var(--accent),transparent)" }}
      />
      <span className="text-2xl">🔥</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">ให้ AI วิจารณ์การใช้เงินของคุณ</p>
        <p className="mt-0.5 text-xs text-fg-muted">แตะเพื่อรับมุมมองแบบตรง ๆ จาก AI</p>
      </div>
      <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black">
        เริ่มเลย
      </span>
    </Link>
  );
}
