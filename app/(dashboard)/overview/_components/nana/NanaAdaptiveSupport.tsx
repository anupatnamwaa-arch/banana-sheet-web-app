"use client";

import React from "react";
import type { DailyBriefState } from "@/lib/nana/types";

interface NanaAdaptiveSupportProps {
  state: DailyBriefState;
  moneyScore: number;
  streak: number;
  upcomingFixedExpensesTotal: number;
}

export function NanaAdaptiveSupport({
  state,
  moneyScore,
  streak,
  upcomingFixedExpensesTotal,
}: NanaAdaptiveSupportProps) {
  const formatVal = (n: number) => Math.round(n).toLocaleString("th-TH");

  switch (state) {
    case "setup":
      return (
        <div className="rounded-2xl border border-[var(--nana-ink,#463315)]/10 bg-[var(--nana-surface-soft,#fff7df)] p-4 space-y-3">
          <h3 className="text-sm font-bold text-[var(--nana-ink,#463315)] flex items-center gap-1.5">
            🌱 นานาพร้อมแนะนำการเงินให้คุณแล้ว!
          </h3>
          <p className="text-xs text-[var(--nana-muted,#877455)] leading-relaxed font-medium">
            เริ่มต้นบันทึกรายรับหรือตั้งเป้าการออมในสลิปทางลัด (Shortcut)
            เพื่อเปิดใช้งานเครื่องมือวิเคราะห์เงินคงเหลือรายวันแบบอัจฉริยะกันนะ
          </p>
          <div className="flex justify-end pt-1">
            <a
              href="/settings"
              className="text-xs font-bold text-[var(--nana-ink,#463315)] bg-[var(--nana-banana,#e6b928)] hover:bg-[var(--nana-banana,#e6b928)]/90 px-3 py-1.5 rounded-lg border border-[var(--nana-ink,#463315)]/10"
            >
              ไปที่เมนูตั้งค่า
            </a>
          </div>
        </div>
      );

    case "payday":
      return (
        <div className="rounded-2xl border border-[var(--nana-ink,#463315)]/10 bg-[var(--nana-surface-soft,#fff7df)] p-4 space-y-3">
          <h3 className="text-sm font-bold text-[var(--nana-ink,#463315)] flex items-center gap-1.5">
            💰 วันนี้มีรายรับเข้ามา! ออมก่อนใช้เลยไหม?
          </h3>
          <p className="text-xs text-[var(--nana-muted,#877455)] leading-relaxed font-medium">
            รายรับใหม่เป็นโอกาสที่ดีในการดึงเงินบางส่วนไปเก็บสะสม
            การแบ่งเงินออมทันทีจะช่วยให้เงินคงเหลือสำหรับการใช้จ่ายรายวันมีความมั่นคงและปลอดภัยมากขึ้น
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button className="text-xs font-bold text-[var(--nana-muted,#877455)] px-3 py-1.5 rounded-lg border border-[var(--nana-ink,#463315)]/10 bg-white/50">
              ไว้ทีหลัง
            </button>
            <a
              href="/settings?tab=categories"
              className="text-xs font-bold text-[var(--nana-ink,#463315)] bg-[var(--nana-banana,#e6b928)] px-3 py-1.5 rounded-lg border border-[var(--nana-ink,#463315)]/10"
            >
              ตั้งเป้าเงินออม
            </a>
          </div>
        </div>
      );

    case "recovery":
      return (
        <div className="rounded-2xl border border-red-500/10 bg-red-50/50 dark:bg-red-950/5 p-4 space-y-3">
          <h3 className="text-sm font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5">
            🛡️ แผนฟื้นฟูวินัยการเงินรายวัน
          </h3>
          <p className="text-xs text-red-700/80 dark:text-red-200/70 leading-relaxed font-medium">
            เนื่องจากรายจ่ายในรอบนี้สูงกว่าเงินส่วนที่ยืดหยุ่น นานาขอแนะนำให้งดจ่ายของฟุ่มเฟือยชั่วคราว
            และโฟกัสไปที่รายการจำเป็นเท่านั้น เพื่อลดแรงกดดันของรายจ่ายลงนะ ค่อย ๆ ปรับไปด้วยกัน!
          </p>
        </div>
      );

    case "attention":
      return (
        <div className="rounded-2xl border border-amber-500/10 bg-amber-50/50 dark:bg-amber-950/5 p-4 space-y-3">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            ⚠️ ตรวจสอบจุดที่ต้องติดตามกันหน่อย
          </h3>
          <p className="text-xs text-amber-700/80 dark:text-amber-200/70 leading-relaxed font-medium">
            {upcomingFixedExpensesTotal > 0
              ? `คุณมีรายจ่ายประจำที่กำลังจะถึงในบิลนี้จำนวน ฿${formatVal(upcomingFixedExpensesTotal)} `
              : ""}
            เพื่อการรักษาวินัย แนะนำให้ลองบันทึกทุกค่าใช้จ่ายอย่างสม่ำเสมอ หรือปรับลดงบประมาณบางหมวดลงในสัปดาห์นี้นะ
          </p>
        </div>
      );

    case "normal":
    default:
      return (
        <div className="rounded-2xl border border-[var(--nana-ink,#463315)]/10 bg-[var(--nana-surface-soft,#fff7df)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--nana-ink,#463315)]">
              📈 สรุปความคืบหน้าเดือนนี้
            </h3>
            {streak >= 3 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                🔥 บันทึกต่อเนื่อง {streak} วัน
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--nana-muted,#877455)] leading-relaxed font-medium">
            พฤติกรรมใช้จ่ายของคุณสม่ำเสมอดีมาก คะแนนวินัยเงินอยู่ในระดับที่เหมาะสม ({moneyScore}/100)
            พยายามรักษาจังหวะใช้จ่ายที่ต่ำกว่างบประมาณรายวันต่อไปนะ นานาเอาใจช่วย!
          </p>
        </div>
      );
  }
}
