// app/(dashboard)/roast/_components/RoastHistory.tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getPersona } from "../_lib/personas";
import { RoastDisplay } from "./RoastDisplay";
import type { PastRoast } from "@/app/actions/roast";

const MONTH_NAMES = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

function reviewMonthLabel(createdAt: string): string {
  const d = new Date(new Date(createdAt).toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const m = d.getMonth() === 0 ? 11 : d.getMonth() - 1;
  const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  return `${MONTH_NAMES[m]} ${y + 543}`;
}

interface Props {
  roasts: PastRoast[];
}

export function RoastHistory({ roasts }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (roasts.length === 0) return null;

  const latest = roasts[0];
  const older = roasts.slice(1);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide">ย้อนหลัง</p>
      </div>

      {/* Latest roast — always visible */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-fg-muted">{reviewMonthLabel(latest.created_at)}</p>
        <RoastDisplay personaId={latest.persona_id} text={latest.roast} streaming={false} />
        {latest.summary && (
          <p className="px-1 text-xs text-fg-muted italic">&ldquo;{latest.summary}&rdquo;</p>
        )}
      </div>

      {/* Older roasts */}
      {older.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl border border-[var(--glass-border)] px-4 py-2.5 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
          >
            <span>{showAll ? "ซ่อนประวัติ" : `ดูทั้งหมด ${older.length} roast ก่อนหน้า`}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showAll ? "rotate-180" : ""}`}
            />
          </button>

          {showAll && (
            <div className="space-y-2">
              {older.map((r) => {
                const persona = getPersona(r.persona_id);
                const expanded = expandedIds.has(r.id);
                return (
                  <div
                    key={r.id}
                    className="glass rounded-2xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(r.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-xl">{persona.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-fg">{reviewMonthLabel(r.created_at)}</p>
                        <p className="text-[10px] text-fg-muted truncate">
                          {r.summary ?? persona.tagline}
                        </p>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-fg-muted shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {expanded && (
                      <div className="border-t border-[var(--glass-border)] px-4 pb-4 pt-3 space-y-2">
                        <RoastDisplay personaId={r.persona_id} text={r.roast} streaming={false} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
