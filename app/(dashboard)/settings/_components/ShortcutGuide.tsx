"use client";

import { useLocale, useT } from "@/lib/i18n/LanguageProvider";

export function ShortcutGuide() {
  const locale = useLocale();
  const t = useT();
  return (
    <details className="glass group">
      <summary className="cursor-pointer list-none p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">📱 {t.settings.shortcutGuide}</p>
          <span className="text-xs text-fg-muted group-open:hidden">{locale === "en" ? "Show ▾" : "แสดง ▾"}</span>
          <span className="hidden text-xs text-fg-muted group-open:inline">{locale === "en" ? "Hide ▴" : "ซ่อน ▴"}</span>
        </div>
      </summary>

      <div className="border-t border-[var(--glass-border)] px-5 pb-5 pt-4 space-y-4 text-sm">
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">1</span>
            <span>{locale === "en" ? "Open " : "เปิดแอป "}<strong>Shortcuts</strong>{locale === "en" ? " on iPhone, tap +, then create a new shortcut." : " บน iPhone → กด + สร้าง Shortcut ใหม่"}</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">2</span>
            <span>{locale === "en" ? "Add the " : "เพิ่ม action "}<strong>&ldquo;Ask for Input&rdquo;</strong>{locale === "en" ? " action and name it " : " → ตั้งชื่อว่า "}<em>&ldquo;{locale === "en" ? "Amount" : "จำนวนเงิน"}&rdquo;</em> (Type: Number)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">3</span>
            <div className="space-y-2">
              <p>{locale === "en" ? "Add the " : "เพิ่ม action "}<strong>&ldquo;Get Contents of URL&rdquo;</strong>{locale === "en" ? " action with these settings:" : " → ตั้งค่าดังนี้:"}</p>
              <div className="rounded-xl bg-[var(--bg-elevated)] p-3 font-mono text-xs space-y-1">
                <p><span className="text-fg-muted">URL:</span> https://YOUR_DOMAIN/api/transactions</p>
                <p><span className="text-fg-muted">Method:</span> POST</p>
                <p><span className="text-fg-muted">Headers:</span> Authorization: Bearer YOUR_API_KEY</p>
                <p><span className="text-fg-muted">Body (JSON):</span></p>
                <pre className="text-xs leading-relaxed">{`{
  "amount": [Provided Input],
  "category": "Food",
  "type": "expense",
  "date": "[Current Date]"
}`}</pre>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">4</span>
            <span>{locale === "en" ? "Tap " : "กด "}<strong>Add to Home Screen</strong>{locale === "en" ? " to add an icon to your home screen." : " เพื่อเพิ่มไอคอนลงหน้าจอหลัก"}</span>
          </li>
        </ol>

        <p className="text-xs text-fg-muted">
          {locale === "en" ? "Replace " : "แทนที่ "}<code className="rounded bg-[var(--bg-elevated)] px-1">YOUR_DOMAIN</code>{locale === "en" ? " with your domain and " : " ด้วยโดเมนของคุณ และ "}
          <code className="rounded bg-[var(--bg-elevated)] px-1">YOUR_API_KEY</code>{locale === "en" ? " with the key above." : " ด้วย Key ด้านบน"}
        </p>
      </div>
    </details>
  );
}
