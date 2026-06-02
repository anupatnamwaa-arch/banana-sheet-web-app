import type { ReactNode } from "react";

type AtelierCardProps = {
  children: ReactNode;
  className?: string;
};

export function AtelierCard({ children, className = "" }: AtelierCardProps) {
  return <section className={`atelier-card ${className}`.trim()}>{children}</section>;
}
