"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function AnalyticsAccordion({ title, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-[var(--glass-border)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-fg">{title}</span>
        <ChevronDown
          size={16}
          className="shrink-0 text-fg-muted transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}
