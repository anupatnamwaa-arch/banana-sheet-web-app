"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ANALYTICS_PERIODS, type AnalyticsPeriod } from "@/app/actions/analytics-utils";

interface Props {
  current: AnalyticsPeriod;
}

export function PeriodPills({ current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function select(id: AnalyticsPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", id);
    startTransition(() => {
      router.push(`/analytics?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 ${isPending ? "opacity-60" : ""}`}>
      {ANALYTICS_PERIODS.map((p) => {
        const active = p.id === current;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => select(p.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-accent text-black"
                : "bg-[var(--glass-bg)] text-fg-muted hover:text-fg"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
