"use client";

import React from "react";

export type NanaGuidePose =
  | "welcome"
  | "helpful"
  | "waiting"
  | "retry"
  | "celebrate";

type NanaGuideProps = {
  className?: string;
  pose?: NanaGuidePose;
};

const poseConfig: Record<
  NanaGuidePose,
  { armLeft: string; armRight: string; eye: string; mouth: string }
> = {
  welcome: {
    armLeft: "M38 54 Q22 42 15 29",
    armRight: "M80 54 Q97 43 104 30",
    eye: "open",
    mouth: "M52 63 Q60 70 68 63",
  },
  helpful: {
    armLeft: "M38 55 Q21 57 14 69",
    armRight: "M80 54 Q97 40 104 24",
    eye: "open",
    mouth: "M53 63 Q60 68 67 63",
  },
  waiting: {
    armLeft: "M39 57 Q27 70 18 64",
    armRight: "M79 57 Q91 70 100 64",
    eye: "soft",
    mouth: "M54 65 Q60 62 66 65",
  },
  retry: {
    armLeft: "M39 55 Q25 47 17 55",
    armRight: "M79 55 Q93 47 101 55",
    eye: "soft",
    mouth: "M53 68 Q60 62 67 68",
  },
  celebrate: {
    armLeft: "M38 53 Q22 34 18 19",
    armRight: "M80 53 Q98 34 102 19",
    eye: "open",
    mouth: "M51 62 Q60 73 69 62",
  },
};

export function NanaGuide({ className = "", pose = "welcome" }: NanaGuideProps) {
  const config = poseConfig[pose] || poseConfig.welcome;

  return (
    <div
      aria-hidden="true"
      className={`relative w-24 h-24 select-none ${className}`.trim()}
    >
      <svg viewBox="0 0 120 120" className="w-full h-full">
        {pose === "celebrate" ? (
          <g className="fill-amber-400 animate-pulse">
            <path d="m19 17 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
            <path d="m101 13 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
            <path d="m109 45 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
          </g>
        ) : null}
        <g className="stroke-[6] stroke-amber-800 stroke-linecap-round stroke-linejoin-round fill-none">
          <path d={config.armLeft} className="stroke-[var(--nana-ink,#463315)]" />
          <path d={config.armRight} className="stroke-[var(--nana-ink,#463315)]" />
          <path d="M51 95 Q47 108 39 111" className="stroke-[var(--nana-ink,#463315)]" />
          <path d="M69 95 Q73 108 81 111" className="stroke-[var(--nana-ink,#463315)]" />
          <path
            d="M43 24c8 10 28 12 40 3 1 31-8 64-29 72-14 5-25-4-23-18 2-16 12-34 12-57Z"
            className="fill-[var(--nana-banana,#e6b928)] stroke-[var(--nana-ink,#463315)] stroke-[6]"
          />
          <path d="M48 35c-1 21-6 39-11 48" className="stroke-white/30 stroke-[3]" />
          <g className="fill-[var(--nana-ink,#463315)] stroke-none">
            {config.eye === "open" ? (
              <>
                <circle cx="54" cy="53" r="3" />
                <circle cx="68" cy="53" r="3" />
              </>
            ) : (
              <>
                {/* Curved closed/happy/sad eyes */}
                <path d="M51 53 Q54 50 57 53 M65 53 Q68 50 71 53" className="stroke-[var(--nana-ink,#463315)] stroke-[3]" />
              </>
            )}
          </g>
          <path d={config.mouth} className="stroke-[var(--nana-ink,#463315)] stroke-[3]" />
        </g>
      </svg>
    </div>
  );
}
