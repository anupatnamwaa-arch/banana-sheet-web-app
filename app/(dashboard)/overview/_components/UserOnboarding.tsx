// app/(dashboard)/overview/_components/UserOnboarding.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check } from "lucide-react";
import { useLocale } from "@/lib/i18n/LanguageProvider";

export function UserOnboarding() {
  const locale = useLocale();
  const [visible, setVisible] = useState(() => !localStorage.getItem("banana_onboarded"));
  const [step, setStep] = useState(0);

  const handleDismiss = () => {
    localStorage.setItem("banana_onboarded", "true");
    setVisible(false);
  };

  const steps = [
    {
      emoji: "🍌",
      titleEn: "Welcome to Banana Sheet!",
      titleTh: "ยินดีต้อนรับสู่ Banana Sheet!",
      descEn: "Hi! I'm Nana, your companion money coach. Let's make personal finance friendly, playful, and completely shame-free!",
      descTh: "สวัสดีจ้า! เราคือ 'นานะ' เพื่อนช่วยคุมงบของคุณเอง มาทำให้การบันทึกการเงินเป็นเรื่องง่าย ชิล ๆ และสนุกแบบไม่มีกิเลศกวนใจนะ!",
      color: "from-yellow-400/20 to-amber-500/5",
    },
    {
      emoji: "💰",
      titleEn: "Meet Safe to Spend",
      titleTh: "ทำความรู้จัก Safe-to-Spend",
      descEn: "Not a bank balance! It's your daily target allowance, calculated after shielding all your recurring bills and committed savings.",
      descTh: "ยอดนี้ไม่ใช่ยอดเงินเก็บนะ! แต่คืองบที่แนะนำให้ใช้ได้จริงในแต่ละวัน หลังหักเงินออมและค่าใช้จ่ายประจำเรียบร้อยแล้วจ้า",
      color: "from-emerald-400/20 to-teal-500/5",
    },
    {
      emoji: "⚡",
      titleEn: "1-Second Logging FAB",
      titleTh: "ปุ่มพิเศษ บันทึกใน 1 วินาที",
      descEn: "Just tap the prominent + button below! Horizontal emojis and quick amount pills make logging transactions completely effortless.",
      descTh: "แตะปุ่ม + สีเหลืองด้านล่างได้เลย! มีปุ่มลัดรายจ่ายยอดฮิตและหมวดหมู่เป็นอิโมจิเพียบ แทบไม่ต้องพิมพ์แป้นพิมพ์เลยนะ!",
      color: "from-amber-400/20 to-orange-500/5",
    },
    {
      emoji: "🔓",
      titleEn: "Hidden Swipe Gestures",
      titleTh: "เคล็ดลับทางลัดการปัดรายการ",
      descEn: "Pro-tip: Swipe left on any transaction row to delete it, or swipe right to duplicate it instantly. Try it on the Transactions tab!",
      descTh: "เคล็ดลับฉบับโปร! ในหน้ารายการธุรกรรม ลอง 'ปัดซ้าย' เพื่อลบ หรือ 'ปัดขวา' เพื่อทำซ้ำรายการได้สะดวกรวดเร็วทันใจ!",
      color: "from-blue-400/20 to-indigo-500/5",
    },
  ];

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={handleDismiss}
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="glass p-6 max-w-sm w-full text-center relative overflow-hidden flex flex-col space-y-5 border border-[var(--glass-border)] shadow-[0_24px_50px_rgba(250,204,21,0.18)] bg-[var(--bg-elevated)]/90 rounded-[2.2rem] z-10"
        >
          {/* Top Skip / Close */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg)]/80 text-fg-muted hover:text-fg transition-colors"
          >
            <X size={15} />
          </button>

          {/* Animated Mascot Circle */}
          <div className="flex justify-center pt-2">
            <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-tr from-accent/20 to-transparent p-1 shadow-inner">
              <div className={`absolute inset-1.5 rounded-full bg-gradient-to-b ${current.color} blur-[2px] opacity-70`} />
              
              <motion.div
                key={step}
                initial={{ scale: 0.7, rotate: -15, opacity: 0 }}
                animate={{ scale: 1, rotate: [0, 5, -5, 0], opacity: 1 }}
                transition={{ type: "tween", duration: 0.5, ease: "easeOut" }}
                className="text-5xl select-none filter drop-shadow-sm z-10"
              >
                {current.emoji}
              </motion.div>
            </div>
          </div>

          {/* Texts */}
          <div className="space-y-2 px-1">
            <h3 className="text-xl font-bold text-fg tracking-tight min-h-[28px]">
              {locale === "en" ? current.titleEn : current.titleTh}
            </h3>
            <p className="text-sm leading-relaxed text-fg-muted min-h-[80px]">
              {locale === "en" ? current.descEn : current.descTh}
            </p>
          </div>

          {/* Steppers Indicators */}
          <div className="flex gap-1.5 justify-center py-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === i ? "w-6 bg-accent" : "w-2 bg-[var(--glass-border)]"
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-1.5">
            {!isLast && (
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 py-3 text-xs font-bold text-fg-muted hover:text-fg hover:bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl transition-all active:scale-[0.98]"
              >
                {locale === "en" ? "Skip" : "ข้ามสอน"}
              </button>
            )}
            
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  handleDismiss();
                } else {
                  setStep((s) => s + 1);
                }
              }}
              className="flex-1 py-3 px-4 text-xs font-bold bg-accent text-black rounded-2xl flex items-center justify-center gap-1.5 shadow-[0_4px_16px_var(--color-accent-shadow)] active:scale-[0.98] transition-all hover:opacity-95"
            >
              <span>
                {isLast 
                  ? (locale === "en" ? "Let's Go!" : "เริ่มใช้งานเลย!") 
                  : (locale === "en" ? "Next" : "ถัดไป")}
              </span>
              {isLast ? <Check size={14} strokeWidth={2.5} /> : <ArrowRight size={14} strokeWidth={2.5} />}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
