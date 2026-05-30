// app/(dashboard)/roast/page.tsx
"use client";

import { useRef, useState } from "react";
import { DEFAULT_PERSONA_ID } from "./_lib/personas";
import { PersonaPicker } from "./_components/PersonaPicker";
import { RoastButton } from "./_components/RoastButton";
import { RoastDisplay } from "./_components/RoastDisplay";
import { QuotePicker } from "./_components/QuotePicker";
import { ShareCard } from "./_components/ShareCard";
import { ShareButton } from "./_components/ShareButton";

interface RoastResponse {
  roast: string;
  quotes: string[];
}

type RateLimitReason = "free_used" | "pro_cooldown" | null;

export default function RoastPage() {
  const [personaId, setPersonaId] = useState(DEFAULT_PERSONA_ID);
  const [streaming, setStreaming] = useState(false);
  const [roastText, setRoastText] = useState("");
  const [quotes, setQuotes] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<number | null>(null);
  const [rateLimitReason, setRateLimitReason] = useState<RateLimitReason>(null);
  const [nextAvailableAt, setNextAvailableAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthLabel] = useState(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const months = [
      "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
      "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
    ];
    return `${months[now.getMonth()]} ${now.getFullYear() + 543}`;
  });
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleRoast() {
    setStreaming(true);
    setRoastText("");
    setQuotes([]);
    setSelectedQuote(null);
    setError(null);

    try {
      const res = await fetch(`/api/roast?persona=${personaId}`);

      if (res.status === 429) {
        const body = await res.json();
        setRateLimitReason(body.error);
        setNextAvailableAt(body.nextAvailableAt ?? null);
        return;
      }

      if (!res.ok || !res.body) {
        setError("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        // Try to extract roast text for progressive display
        const roastMatch = accumulated.match(/"roast"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        if (roastMatch) {
          setRoastText(roastMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
        }
      }

      // Parse complete JSON
      try {
        const parsed: RoastResponse = JSON.parse(accumulated);
        setRoastText(parsed.roast);
        setQuotes(parsed.quotes);
      } catch {
        setError("ไม่สามารถ parse ผลลัพธ์ได้ ลองใหม่อีกครั้ง");
      }
    } catch {
      setError("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setStreaming(false);
    }
  }

  const showShareSection = quotes.length > 0 && !streaming;

  return (
    <section className="space-y-4 pb-32">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Roast</h1>
        <p className="text-sm text-fg-muted">Let the AI judge your spending.</p>
      </header>

      <PersonaPicker selected={personaId} onChange={setPersonaId} />

      <RoastButton
        onClick={handleRoast}
        loading={streaming}
        rateLimitReason={rateLimitReason}
        nextAvailableAt={nextAvailableAt}
      />

      {error && (
        <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{error}</p>
      )}

      {roastText && (
        <RoastDisplay personaId={personaId} text={roastText} streaming={streaming} />
      )}

      {showShareSection && (
        <>
          <QuotePicker
            quotes={quotes}
            selected={selectedQuote}
            onSelect={setSelectedQuote}
          />
          <ShareButton cardRef={cardRef} disabled={selectedQuote === null} />
          {selectedQuote !== null && (
            <ShareCard
              ref={cardRef}
              personaId={personaId}
              quote={quotes[selectedQuote]}
              monthLabel={monthLabel}
            />
          )}
        </>
      )}
    </section>
  );
}
