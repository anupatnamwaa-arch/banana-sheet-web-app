// app/(dashboard)/roast/page.tsx
"use client";

import { useRef, useState } from "react";
import { DEFAULT_PERSONA_ID } from "./_lib/personas";
import { PersonaPicker } from "./_components/PersonaPicker";
import { RoastButton } from "./_components/RoastButton";
import { RoastDisplay } from "./_components/RoastDisplay";
import { ShareCard } from "./_components/ShareCard";
import { ShareButton } from "./_components/ShareButton";

interface RoastResponse {
  roast: string;
  summary: string;
}

type RateLimitReason = "free_used" | "pro_cooldown" | null;

export default function RoastPage() {
  const [personaId, setPersonaId] = useState(DEFAULT_PERSONA_ID);
  const [streaming, setStreaming] = useState(false);
  const [roastText, setRoastText] = useState("");
  const [summary, setSummary] = useState("");
  const [rateLimitReason, setRateLimitReason] = useState<RateLimitReason>(null);
  const [nextAvailableAt, setNextAvailableAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthLabel] = useState(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const months = [
      "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
      "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
    ];
    // Show last month label (review period)
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return `${months[lastMonth]} ${lastYear + 543}`;
  });
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleRoast() {
    setStreaming(true);
    setRoastText("");
    setSummary("");
    setError(null);
    setRateLimitReason(null);
    setNextAvailableAt(null);

    try {
      const res = await fetch(`/api/roast?persona=${encodeURIComponent(personaId)}`);

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

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          // Progressive display of roast text while streaming
          const roastMatch = accumulated.match(/"roast"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
          if (roastMatch) {
            setRoastText(roastMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
          }
        }
      } catch (streamErr) {
        reader.cancel();
        throw streamErr;
      }

      // Parse complete JSON
      try {
        const parsed: RoastResponse = JSON.parse(accumulated);
        setRoastText(parsed.roast);
        setSummary(parsed.summary ?? "");
      } catch {
        setError("ไม่สามารถ parse ผลลัพธ์ได้ ลองใหม่อีกครั้ง");
      }
    } catch {
      setError("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setStreaming(false);
    }
  }

  const showShareSection = !!summary && !streaming;

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
          <div className="glass rounded-2xl p-4 text-sm text-fg-muted leading-relaxed">
            &ldquo;{summary}&rdquo;
          </div>
          <ShareButton cardRef={cardRef} />
          <ShareCard
            ref={cardRef}
            personaId={personaId}
            summary={summary}
            monthLabel={monthLabel}
          />
        </>
      )}
    </section>
  );
}
