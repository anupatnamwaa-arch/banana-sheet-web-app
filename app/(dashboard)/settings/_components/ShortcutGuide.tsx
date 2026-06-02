"use client";

import { useLocale, useT } from "@/lib/i18n/LanguageProvider";
import { useState } from "react";

export function ShortcutGuide() {
  const locale = useLocale();
  const t = useT();
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "https://banana-sheet.vercel.app"
  );
  return (
    <details className="glass group">
      <summary className="cursor-pointer list-none p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">📱 {t.settings.shortcutGuide}</p>
          <span className="text-xs text-fg-muted group-open:hidden">{t.settings.shortcutShow}</span>
          <span className="hidden text-xs text-fg-muted group-open:inline">{t.settings.shortcutHide}</span>
        </div>
      </summary>

      <div className="border-t border-[var(--glass-border)] px-5 pb-5 pt-4 space-y-4 text-sm">
        {/* Quick Setup Template Download Button */}
        <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 flex flex-col items-center justify-center text-center space-y-2">
          <p className="text-xs font-semibold text-accent select-none">
            {locale === "en" ? "⚡ Quick Setup: Import Pre-made Template" : "⚡ ตั้งค่าด่วน: นำเข้าเทมเพลตสำเร็จรูป"}
          </p>
          <a
            href="https://www.icloud.com/shortcuts/8f37603076674ec4b74c0fb1daf2f5ff"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-black shadow-[0_4px_12px_var(--color-accent-shadow)] transition-all hover:scale-105 active:scale-95 duration-150"
          >
            <span>📥</span>
            <span>{locale === "en" ? "Get iOS Shortcut Template" : "ดาวน์โหลด iOS Shortcut"}</span>
          </a>
          <p className="text-[10px] text-fg-muted leading-relaxed">
            {locale === "en" 
              ? "Instantly add the Shortcut to your iPhone. During setup, just paste your API Key from above!"
              : "นำเข้าสลิปทางลัดไปยังแอป Shortcuts ได้ทันที จากนั้นเพียงกรอก API Key ด้านบนจ้า"}
          </p>
        </div>

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
                <p><span className="text-fg-muted">URL:</span> {origin}/api/transactions</p>
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

        <p className="text-xs text-fg-muted leading-relaxed">
          {locale === "en" 
            ? "Your current domain is already pre-filled above! You only need to replace " 
            : "ระบบกรอกโดเมนปัจจุบันให้คุณแล้วด้านบน! คุณเพียงต้องแทนที่ "}
          <code className="rounded bg-[var(--bg-elevated)] px-1">YOUR_API_KEY</code>
          {locale === "en" ? " with your API key from above." : " ด้วย Key ด้านบนเท่านั้นเอง"}
        </p>
      </div>
    </details>
  );
}
