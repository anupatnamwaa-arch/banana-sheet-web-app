// app/(dashboard)/roast/_components/ShareCard.tsx
"use client";

import { forwardRef } from "react";
import { getPersona } from "../_lib/personas";

interface Props {
  personaId: string;
  summary: string;
  monthLabel: string;
}

// Fake engagement seeded from the summary so it's stable per roast
function fakeEngagement(summary: string) {
  const seed = summary.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const retweets = 10 + (seed % 41);   // 10–50
  const likes = 100 + (seed % 401);    // 100–500
  return { retweets, likes };
}

export const ShareCard = forwardRef<HTMLDivElement, Props>(
  ({ personaId, summary, monthLabel }, ref) => {
    const persona = getPersona(personaId);
    const { retweets, likes } = fakeEngagement(summary);
    const now = new Date();
    const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

    return (
      // 9:16 card — rendered off-screen, captured by html-to-image
      <div
        ref={ref}
        style={{
          width: 390,
          height: 693,
          background: "#0f1117",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          boxSizing: "border-box",
          fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
        }}
      >
        {/* Tweet card */}
        <div
          style={{
            background: "#16202a",
            borderRadius: 20,
            padding: "20px",
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #2a3a4a",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {persona.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e7e9ea", fontWeight: 700, fontSize: 15 }}>
                {persona.name}
              </div>
              <div style={{ color: "#8899a6", fontSize: 13 }}>{persona.handle}</div>
            </div>
            <div style={{ color: "#1d9bf0", fontSize: 20, fontWeight: 700 }}>𝕏</div>
          </div>

          {/* Quote text */}
          <div
            style={{
              color: "#e7e9ea",
              fontSize: 16,
              lineHeight: 1.75,
              marginBottom: 16,
            }}
          >
            &ldquo;{summary}&rdquo;
          </div>

          {/* Timestamp */}
          <div
            style={{
              color: "#8899a6",
              fontSize: 13,
              borderTop: "1px solid #2a3a4a",
              paddingTop: 12,
              marginBottom: 12,
            }}
          >
            {timeStr} · {monthLabel} ·{" "}
            <span style={{ color: "#e7e9ea", fontWeight: 600 }}>Banana Sheet</span>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 20, color: "#8899a6", fontSize: 13 }}>
            <span>
              🔁 <strong style={{ color: "#e7e9ea" }}>{retweets}</strong> Retweets
            </span>
            <span>
              ❤️ <strong style={{ color: "#e7e9ea" }}>{likes}</strong> Likes
            </span>
          </div>
        </div>

        {/* Watermark */}
        <div style={{ marginTop: 20, color: "#3a3a5a", fontSize: 12 }}>
          Roasted by Banana Sheet 🍌
        </div>
      </div>
    );
  },
);

ShareCard.displayName = "ShareCard";
