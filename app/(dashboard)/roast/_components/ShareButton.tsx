// app/(dashboard)/roast/_components/ShareButton.tsx
"use client";

import { RefObject, useState } from "react";
import { toPng } from "html-to-image";

interface Props {
  cardRef: RefObject<HTMLDivElement | null>;
  disabled: boolean;
}

export function ShareButton({ cardRef, disabled }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "roast.png", { type: "image/png" });
      const canShareFiles =
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        await navigator.share({ files: [file], title: "Roasted by Banana Sheet 🍌" });
      } else {
        // Fallback: download
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "roast.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("[ShareButton] share failed", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={disabled || loading}
      className="w-full rounded-2xl bg-accent py-3 font-semibold text-white disabled:opacity-40"
    >
      {loading ? "กำลังสร้างรูป..." : "แชร์ 🍌"}
    </button>
  );
}
