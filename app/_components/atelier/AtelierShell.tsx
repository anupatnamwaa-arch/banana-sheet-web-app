import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

type AtelierShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

const themeBootstrap = `
try {
  var storedTheme = localStorage.getItem("bs-theme");
  var selectedTheme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
    ? storedTheme
    : "dark";
  var resolvedTheme = selectedTheme === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : selectedTheme;
  document.documentElement.setAttribute("data-theme", resolvedTheme);
} catch {}
`;

export function AtelierShell({
  children,
  className = "",
  contentClassName = "",
}: AtelierShellProps) {
  return (
    <main className={`atelier-shell ${className}`.trim()}>
      <script
        dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        id="atelier-theme-bootstrap"
      />
      <span aria-hidden="true" className="atelier-peel atelier-peel-one" />
      <span aria-hidden="true" className="atelier-peel atelier-peel-two" />
      <span aria-hidden="true" className="atelier-peel atelier-peel-three" />
      <ThemeToggle />
      <div className={`atelier-shell-content ${contentClassName}`.trim()}>
        {children}
      </div>
    </main>
  );
}
