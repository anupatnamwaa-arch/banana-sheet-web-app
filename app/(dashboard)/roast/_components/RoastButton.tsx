// app/(dashboard)/roast/_components/RoastButton.tsx
"use client";

interface Props {
  onClick: () => void;
  loading: boolean;
  rateLimitReason: "free_used" | "pro_cooldown" | null;
  nextAvailableAt: string | null;
}

function daysUntil(iso: string): number {
  return Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function RoastButton({ onClick, loading, rateLimitReason, nextAvailableAt }: Props) {
  if (rateLimitReason === "free_used") {
    return (
      <div className="glass rounded-2xl p-4 text-center">
        <p className="text-sm font-medium">ใช้ Roast ฟรีไปแล้ว 1 ครั้ง</p>
        <p className="mt-1 text-xs text-fg-muted">อัปเกรดเป็น Pro เพื่อ Roast อีกครั้ง</p>
      </div>
    );
  }

  if (rateLimitReason === "pro_cooldown") {
    return (
      <div className="glass rounded-2xl p-4 text-center">
        <p className="text-sm font-medium">
          {nextAvailableAt
            ? `Roast อีกครั้งได้ใน ${daysUntil(nextAvailableAt)} วัน`
            : "ยังไม่สามารถ Roast ได้"}
        </p>
        <p className="mt-1 text-xs text-fg-muted">Pro: 1 ครั้งต่อสัปดาห์</p>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full rounded-2xl bg-accent py-3 font-semibold text-white disabled:opacity-40"
    >
      {loading ? "กำลัง Roast..." : "🔥 Roast Me"}
    </button>
  );
}
