// app/(dashboard)/roast/_components/RoastDisplay.tsx
"use client";

import { getPersona } from "../_lib/personas";

interface Props {
  personaId: string;
  text: string;
  streaming: boolean;
}

function renderBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-accent">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

export function RoastDisplay({ personaId, text, streaming }: Props) {
  const persona = getPersona(personaId);
  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{persona.emoji}</span>
        <div>
          <p className="text-sm font-semibold">{persona.name}</p>
          <p className="text-xs text-fg-muted">{persona.handle}</p>
        </div>
      </div>
      <div className="space-y-3">
        {paragraphs.map((para, i) => {
          const isLast = i === paragraphs.length - 1;
          const content = renderBold(para.trim());
          return (
            <p
              key={i}
              className={`text-sm leading-relaxed ${
                isLast
                  ? "border-l-2 border-accent pl-3 text-fg"
                  : "text-fg-muted"
              }`}
            >
              {content}
              {streaming && isLast && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent" />
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}
