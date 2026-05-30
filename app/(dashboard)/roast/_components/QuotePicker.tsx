// app/(dashboard)/roast/_components/QuotePicker.tsx
"use client";

interface Props {
  quotes: string[];
  selected: number | null;
  onSelect: (index: number) => void;
}

export function QuotePicker({ quotes, selected, onSelect }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-fg-muted">เลือก quote เพื่อแชร์</p>
      {quotes.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`w-full rounded-xl p-3 text-left text-sm transition-colors ${
            selected === i
              ? "border border-accent bg-accent/10 text-fg"
              : "glass text-fg-muted"
          }`}
        >
          "{q}"
        </button>
      ))}
    </div>
  );
}
