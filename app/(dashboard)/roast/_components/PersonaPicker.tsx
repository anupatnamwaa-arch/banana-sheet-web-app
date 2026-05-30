// app/(dashboard)/roast/_components/PersonaPicker.tsx
"use client";

import { PERSONAS } from "../_lib/personas";

interface Props {
  selected: string;
  onChange: (id: string) => void;
}

export function PersonaPicker({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PERSONAS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          aria-pressed={selected === p.id}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            selected === p.id
              ? "bg-accent text-white"
              : "glass text-fg-muted"
          }`}
        >
          <span>{p.emoji}</span>
          <span>{p.name}</span>
        </button>
      ))}
    </div>
  );
}
