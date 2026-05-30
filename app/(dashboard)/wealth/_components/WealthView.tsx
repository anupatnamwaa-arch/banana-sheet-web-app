"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatTHB } from "@/lib/format";
import type { WealthData, AssetRow, DebtRow } from "@/app/actions/wealth-data";
import type { Goal } from "@/lib/types";
import { WealthFormDrawer, type WealthRow } from "./WealthFormDrawer";
import { GoalFormDrawer } from "./GoalFormDrawer";
import { NetWorthTrend } from "./NetWorthTrend";

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function assetIcon(name: string): string {
  if (/เงินสด|cash/i.test(name)) return "💵";
  if (/ฝาก|ออมทรัพย์|ธนาคาร|bank/i.test(name)) return "🏦";
  if (/ลงทุน|หุ้น|กองทุน|etf|fund/i.test(name)) return "📈";
  if (/ทอง|gold/i.test(name)) return "🪙";
  if (/บ้าน|ที่ดิน|คอนโด|property/i.test(name)) return "🏠";
  if (/รถ|car/i.test(name)) return "🚗";
  return "💼";
}

function debtIcon(name: string): string {
  if (/บัตร|credit/i.test(name)) return "💳";
  if (/รถ|car/i.test(name)) return "🚗";
  if (/บ้าน|home|mortgage/i.test(name)) return "🏠";
  if (/กู้|สินเชื่อ|loan/i.test(name)) return "🏧";
  return "🧾";
}

function thaiDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, dd] = parts.split("-").map(Number);
  return `${dd} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

function dueLabel(due: string): { text: string; near: boolean } {
  const [y, m, d] = due.split("-").map(Number);
  const dueMs = Date.UTC(y, m - 1, d);
  const days = Math.round((dueMs - Date.now()) / 86_400_000);
  return { text: `ครบกำหนด ${d} ${THAI_MONTHS[m - 1]}`, near: days >= 0 && days <= 7 };
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4 ${className}`}>
      {children}
    </div>
  );
}

export function WealthView({ data }: { data: WealthData }) {
  const router = useRouter();
  const [wealthDrawer, setWealthDrawer] = useState<
    { mode: "add" | "edit"; item?: WealthRow; initialType?: "asset" | "liability" } | null
  >(null);
  const [goalDrawer, setGoalDrawer] = useState<{ mode: "add" | "edit"; goal?: Goal } | null>(null);
  const [showAllAssets, setShowAllAssets] = useState(false);

  const refresh = () => router.refresh();

  const {
    hasData, assets, liabilities, totalAssets, totalLiabilities, netWorth,
    prevNetWorth, emergencyFund, monthlyExpense, goals, trend, updatedAt,
  } = data;

  const nwChange = prevNetWorth !== null ? netWorth - prevNetWorth : null;
  const debtRatio = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : null;
  const monthlyDebt = liabilities.reduce((s, l) => s + (l.monthly_payment ?? 0), 0);
  const nearDue = liabilities.filter((l) => l.due_date && dueLabel(l.due_date).near).length;

  // Emergency fund: liquid assets vs a recommended 3 months of expenses.
  const recommendedTarget = monthlyExpense > 0 ? Math.round(monthlyExpense * 3) : 0;
  const coverageMonths = monthlyExpense > 0 ? emergencyFund / monthlyExpense : null;
  const efPct = recommendedTarget > 0 ? Math.min(100, Math.round((emergencyFund / recommendedTarget) * 100)) : 0;

  const topAssets = showAllAssets ? assets : assets.slice(0, 5);
  const maxAsset = assets[0]?.value ?? 1;

  // Debt health status
  let debtStatus = { text: "ยังไม่มีหนี้สิน สุขภาพการเงินดีมาก", color: "text-positive" };
  if (debtRatio !== null) {
    if (debtRatio > 50) debtStatus = { text: "ระดับหนี้ค่อนข้างสูง ควรวางแผนลดหนี้", color: "text-negative" };
    else if (debtRatio > 30) debtStatus = { text: "ระดับหนี้ปานกลาง จับตาดูไว้นิดนึง", color: "text-amber-400" };
    else debtStatus = { text: "ระดับหนี้ยังอยู่ในเกณฑ์ควบคุมได้", color: "text-positive" };
  }

  const insights: string[] = [];
  if (nwChange !== null && nwChange !== 0) {
    insights.push(
      `มูลค่าสุทธิของคุณ${nwChange > 0 ? "เพิ่มขึ้น" : "ลดลง"} ${formatTHB(Math.abs(nwChange))} จากเดือนก่อน`
    );
  }
  if (debtRatio !== null && totalLiabilities > 0) {
    insights.push(`หนี้สินคิดเป็น ${debtRatio}% ของสินทรัพย์ทั้งหมด`);
  }

  function editAsset(a: AssetRow) {
    setWealthDrawer({ mode: "edit", item: { id: a.id, name: a.name, type: "asset", value: a.value, is_liquid: a.is_liquid } });
  }
  function editDebt(l: DebtRow) {
    setWealthDrawer({
      mode: "edit",
      item: { id: l.id, name: l.name, type: "liability", value: l.value, is_liquid: false, monthly_payment: l.monthly_payment, due_date: l.due_date },
    });
  }

  return (
    <section className="space-y-4 pb-4">
      {/* Header */}
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">ความมั่งคั่ง</h1>
        <p className="mt-0.5 text-sm text-fg-muted">
          ดูภาพรวมสินทรัพย์ หนี้สิน และเป้าหมายการเงินของคุณ
        </p>
        {updatedAt && (
          <p className="mt-1 text-xs text-fg-muted">อัปเดตล่าสุด: {thaiDate(updatedAt)}</p>
        )}
      </header>

      {!hasData ? (
        <Card className="p-8 text-center">
          <p className="text-3xl">💎</p>
          <p className="mt-3 text-base font-semibold">ยังไม่มีข้อมูลความมั่งคั่ง</p>
          <p className="mt-1 text-sm text-fg-muted">
            เพิ่มสินทรัพย์ หนี้สิน หรือเป้าหมายการเงิน เพื่อดูมูลค่าสุทธิของคุณ
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={() => setWealthDrawer({ mode: "add", initialType: "asset" })}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black"
            >
              เพิ่มสินทรัพย์
            </button>
            <button
              onClick={() => setGoalDrawer({ mode: "add" })}
              className="rounded-full border border-[var(--glass-border)] px-4 py-1.5 text-xs font-semibold text-fg"
            >
              เพิ่มเป้าหมาย
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Net worth main card */}
          <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-5">
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: "linear-gradient(90deg,#818cf8,transparent)" }}
            />
            <p className="text-xs text-fg-muted">มูลค่าสุทธิ</p>
            <p className={`mt-1 text-4xl font-bold tracking-tight tabular-nums ${netWorth < 0 ? "text-negative" : "text-fg"}`}>
              {netWorth < 0 ? "-" : ""}{formatTHB(Math.abs(netWorth))}
            </p>
            <p className="mt-1 text-xs text-fg-muted">สินทรัพย์ทั้งหมด − หนี้สินทั้งหมด</p>
            {nwChange !== null && nwChange !== 0 && (
              <p className={`mt-2 text-xs font-medium ${nwChange > 0 ? "text-positive" : "text-negative"}`}>
                {nwChange > 0 ? "เพิ่มขึ้น" : "ลดลง"} {formatTHB(Math.abs(nwChange))} จากเดือนก่อน
              </p>
            )}
          </div>

          {/* Asset + debt summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-positive/10 p-3">
              <p className="text-xs text-fg-muted">สินทรัพย์รวม</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-positive">{formatTHB(totalAssets)}</p>
              <p className="mt-1 text-[11px] leading-tight text-fg-muted">เงินสด ออมทรัพย์ ลงทุน และอื่น ๆ</p>
            </div>
            <div className="rounded-2xl bg-negative/10 p-3">
              <p className="text-xs text-fg-muted">หนี้สินรวม</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-negative">{formatTHB(totalLiabilities)}</p>
              <p className="mt-1 text-[11px] leading-tight text-fg-muted">บัตรเครดิต สินเชื่อ และยอดผ่อนคงเหลือ</p>
            </div>
          </div>

          {/* Asset breakdown */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">สินทรัพย์ของฉัน</p>
              <div className="flex items-center gap-3">
                {assets.length > 5 && (
                  <button onClick={() => setShowAllAssets((v) => !v)} className="text-xs text-fg-muted">
                    {showAllAssets ? "ย่อ" : "ดูทั้งหมด"}
                  </button>
                )}
                <button
                  onClick={() => setWealthDrawer({ mode: "add", initialType: "asset" })}
                  className="text-xs text-accent"
                >
                  เพิ่ม
                </button>
              </div>
            </div>
            {assets.length === 0 ? (
              <p className="py-3 text-center text-xs text-fg-muted">ยังไม่มีสินทรัพย์ — แตะ “เพิ่ม” เพื่อเริ่ม</p>
            ) : (
              <div className="space-y-3">
                {topAssets.map((a) => {
                  const pct = totalAssets > 0 ? Math.round((a.value / totalAssets) * 100) : 0;
                  return (
                    <button key={a.id} onClick={() => editAsset(a)} className="block w-full text-left">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span>{assetIcon(a.name)}</span>
                          <span className="truncate text-fg">{a.name}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-fg-muted">
                          {formatTHB(a.value)} <span className="text-fg-muted/70">{pct}%</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
                        <div className="h-full rounded-full bg-positive" style={{ width: `${Math.max(4, Math.round((a.value / maxAsset) * 100))}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Debt breakdown */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">หนี้สินของฉัน</p>
              <button
                onClick={() => setWealthDrawer({ mode: "add", initialType: "liability" })}
                className="text-xs text-accent"
              >
                เพิ่ม
              </button>
            </div>
            {liabilities.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm font-medium text-positive">ไม่มีหนี้สินตอนนี้ 🎉</p>
                <p className="mt-1 text-xs text-fg-muted">ดีมาก รักษาวินัยแบบนี้ต่อไป</p>
              </div>
            ) : (
              <div className="space-y-2">
                {liabilities.map((l) => {
                  const due = l.due_date ? dueLabel(l.due_date) : null;
                  return (
                    <button
                      key={l.id}
                      onClick={() => editDebt(l)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-[var(--glass-bg)] px-3 py-2.5 text-left"
                    >
                      <span className="text-lg">{debtIcon(l.name)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.name}</p>
                        <p className="text-xs text-fg-muted">
                          คงเหลือ {formatTHB(l.value)}
                          {l.monthly_payment ? ` • ผ่อนเดือนละ ${formatTHB(l.monthly_payment)}` : ""}
                        </p>
                        {due && (
                          <p className={`text-xs ${due.near ? "text-amber-400" : "text-fg-muted"}`}>{due.text}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-negative">
                        {formatTHB(l.value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Debt health */}
          {liabilities.length > 0 && (
            <Card>
              <p className="mb-3 text-sm font-semibold">สุขภาพหนี้</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[11px] text-fg-muted">หนี้ต่อสินทรัพย์</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums">{debtRatio !== null ? `${debtRatio}%` : "—"}</p>
                </div>
                <div className="border-x border-[var(--glass-border)]">
                  <p className="text-[11px] text-fg-muted">ผ่อนต่อเดือน</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums">{formatTHB(monthlyDebt)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-fg-muted">ใกล้ครบกำหนด</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums">{nearDue} รายการ</p>
                </div>
              </div>
              <p className={`mt-3 text-xs font-medium ${debtStatus.color}`}>{debtStatus.text}</p>
            </Card>
          )}

          {/* Emergency fund */}
          {recommendedTarget > 0 && (
            <Card>
              <p className="mb-1 text-sm font-semibold">เงินสำรองฉุกเฉิน</p>
              <p className="text-2xl font-bold tabular-nums text-blue-400">
                {formatTHB(emergencyFund)} <span className="text-sm font-normal text-fg-muted">/ {formatTHB(recommendedTarget)}</span>
              </p>
              {coverageMonths !== null && (
                <p className="mt-0.5 text-xs text-fg-muted">
                  ครอบคลุมค่าใช้จ่ายประมาณ {coverageMonths.toFixed(1)} เดือน
                </p>
              )}
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
                <div className="h-full rounded-full bg-blue-400" style={{ width: `${efPct}%` }} />
              </div>
              <p className="mt-2 text-xs text-fg-muted">เป้าหมายแนะนำ: 3–6 เดือนของค่าใช้จ่าย</p>
            </Card>
          )}

          {/* Goals */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">เป้าหมายการเงิน</p>
              <button onClick={() => setGoalDrawer({ mode: "add" })} className="text-xs text-accent">
                เพิ่มเป้าหมาย
              </button>
            </div>
            {goals.length === 0 ? (
              <p className="py-3 text-center text-xs text-fg-muted">ยังไม่มีเป้าหมาย — แตะ “เพิ่มเป้าหมาย” เพื่อเริ่ม</p>
            ) : (
              <div className="space-y-3">
                {goals.map((g) => {
                  const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
                  return (
                    <button key={g.id} onClick={() => setGoalDrawer({ mode: "edit", goal: g })} className="block w-full text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{g.name}</p>
                        <p className="text-xs font-semibold tabular-nums text-amber-400">{pct}%</p>
                      </div>
                      <p className="text-xs text-fg-muted tabular-nums">
                        {formatTHB(g.current_amount)} / {formatTHB(g.target_amount)}
                        {g.target_date ? ` • เป้าหมาย ${thaiDate(g.target_date)}` : ""}
                      </p>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Net worth trend */}
          <NetWorthTrend trend={trend} />

          {/* Insights */}
          {insights.length > 0 && (
            <div className="space-y-2">
              <p className="px-1 text-sm font-semibold">ข้อสังเกต</p>
              {insights.map((text, i) => (
                <Card key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-lg">✨</span>
                  <p className="text-sm leading-relaxed text-fg-muted">{text}</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {wealthDrawer && (
        <WealthFormDrawer
          mode={wealthDrawer.mode}
          item={wealthDrawer.item}
          initialType={wealthDrawer.initialType}
          onClose={() => setWealthDrawer(null)}
          onSuccess={refresh}
        />
      )}
      {goalDrawer && (
        <GoalFormDrawer
          mode={goalDrawer.mode}
          goal={goalDrawer.goal}
          onClose={() => setGoalDrawer(null)}
          onSuccess={refresh}
        />
      )}
    </section>
  );
}
