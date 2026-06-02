export type BananaGuidePose =
  | "welcome"
  | "helpful"
  | "waiting"
  | "retry"
  | "celebrate";

type BananaGuideProps = {
  className?: string;
  pose?: BananaGuidePose;
};

const poseConfig: Record<
  BananaGuidePose,
  { armLeft: string; armRight: string; eye: string; mouth: string }
> = {
  welcome: { armLeft: "M38 54 Q22 42 15 29", armRight: "M80 54 Q97 43 104 30", eye: "open", mouth: "M52 63 Q60 70 68 63" },
  helpful: { armLeft: "M38 55 Q21 57 14 69", armRight: "M80 54 Q97 40 104 24", eye: "open", mouth: "M53 63 Q60 68 67 63" },
  waiting: { armLeft: "M39 57 Q27 70 18 64", armRight: "M79 57 Q91 70 100 64", eye: "soft", mouth: "M54 65 Q60 62 66 65" },
  retry: { armLeft: "M39 55 Q25 47 17 55", armRight: "M79 55 Q93 47 101 55", eye: "soft", mouth: "M53 68 Q60 62 67 68" },
  celebrate: { armLeft: "M38 53 Q22 34 18 19", armRight: "M80 53 Q98 34 102 19", eye: "open", mouth: "M51 62 Q60 73 69 62" },
};

export function BananaGuide({ className = "", pose = "welcome" }: BananaGuideProps) {
  const config = poseConfig[pose];

  return (
    <div
      aria-hidden="true"
      className={`atelier-banana atelier-banana-float ${className}`.trim()}
    >
      <svg viewBox="0 0 120 120">
        {pose === "celebrate" ? (
          <g className="atelier-banana-stars">
            <path d="m19 17 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
            <path d="m101 13 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
            <path d="m109 45 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
          </g>
        ) : null}
        <g className={`atelier-banana-pose atelier-banana-pose-${pose}`}>
          <path className="atelier-banana-limb" d={config.armLeft} />
          <path className="atelier-banana-limb" d={config.armRight} />
          <path className="atelier-banana-limb" d="M51 95 Q47 108 39 111" />
          <path className="atelier-banana-limb" d="M69 95 Q73 108 81 111" />
          <path
            className="atelier-banana-body"
            d="M43 24c8 10 28 12 40 3 1 31-8 64-29 72-14 5-25-4-23-18 2-16 12-34 12-57Z"
          />
          <path className="atelier-banana-shine" d="M48 35c-1 21-6 39-11 48" />
          <g className={`atelier-banana-eyes atelier-banana-eyes-${config.eye}`}>
            <circle cx="54" cy="53" r="2.3" />
            <circle cx="68" cy="53" r="2.3" />
          </g>
          <path className="atelier-banana-mouth" d={config.mouth} />
        </g>
      </svg>
    </div>
  );
}
