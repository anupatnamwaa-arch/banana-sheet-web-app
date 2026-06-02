// app/(dashboard)/analytics/_components/RoastInsightSection.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { getPersona } from "@/app/(dashboard)/roast/_lib/personas";
import { motion, AnimatePresence } from "framer-motion";

export interface RoastInsight {
  id: string;
  roast: string;
  summary: string | null;
  persona_id: string;
  created_at: string;
}

interface Props {
  latestRoast: RoastInsight | null;
}

export function RoastInsightSection({ latestRoast }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!latestRoast) {
    // Fallback to standard Roast Entry Card if no historical roast exists
    return (
      <Link
        href="/roast"
        className="relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4 transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] border border-orange-500/10"
      >
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, var(--accent), transparent)" }}
        />
        <span className="text-2xl animate-pulse">🔥</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">ให้ AI วิจารณ์การใช้เงินของคุณ</p>
          <p className="mt-0.5 text-xs text-fg-muted">แตะเพื่อรับมุมมองแบบตรง ๆ จาก AI ย้อนหลัง</p>
        </div>
        <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black">
          เริ่มเลย
        </span>
      </Link>
    );
  }

  const persona = getPersona(latestRoast.persona_id);
  const formattedDate = new Date(latestRoast.created_at).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border border-orange-500/20 p-5 shadow-lg transition-all">
      {/* Decorative gradient strip */}
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "linear-gradient(90deg, #fb923c, #ef4444, #f59e0b)" }}
      />

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <h3 className="text-sm font-bold tracking-wide text-orange-400 uppercase">
            คำวิจารณ์ล่าสุดจาก AI
          </h3>
        </div>
        <span className="text-xxs text-fg-muted font-medium bg-white/5 px-2 py-0.5 rounded-md">
          {formattedDate}
        </span>
      </div>

      {/* Summary sentence */}
      {latestRoast.summary && (
        <div
          onClick={() => setExpanded(!expanded)}
          className={[
            'group relative flex items-start gap-3 rounded-xl',
            'bg-white/[0.02] hover:bg-orange-500/[0.03]',
            'border border-white/[0.04] hover:border-orange-500/20',
            'p-3.5 cursor-pointer transition-all duration-300',
          ].join(' ')}
        >
          <span className='text-lg text-orange-400/60 leading-none'>{'“'}</span>
          <div className='flex-1 min-w-0'>
            <p className='text-sm text-fg font-medium leading-relaxed group-hover:text-orange-300 transition-colors'>
              {latestRoast.summary}
            </p>
          </div>
          <div className='self-center flex items-center justify-center w-5 h-5 rounded-full bg-white/5 group-hover:bg-orange-500/10 transition-colors'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width={12}
              height={12}
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth={2.5}
              strokeLinecap='round'
              strokeLinejoin='round'
              className={`text-fg-muted group-hover:text-orange-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            >
              <path d='m6 9 6 6 6-6' />
            </svg>
          </div>
        </div>
      )}

      {/* Main Historical Paragraph (Expanded) */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center gap-2 text-xs bg-orange-500/10 text-orange-300 w-fit px-2.5 py-1 rounded-full">
                <span>{persona.emoji}</span>
                <span className="font-semibold">{persona.name} {persona.handle}</span>
              </div>
              
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line bg-black/20 rounded-xl p-4 border border-white/[0.03]">
                {latestRoast.roast}
              </p>

              <div className="flex justify-end pt-1">
                <Link
                  href="/roast"
                  className="text-xs text-orange-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Roast อีกครั้ง</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
