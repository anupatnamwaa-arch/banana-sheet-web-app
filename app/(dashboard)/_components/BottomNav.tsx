"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ChartLine, Wallet, Settings } from "lucide-react";

const tabs = [
  { href: "/overview", label: "Overview", Icon: LayoutGrid },
  { href: "/analytics", label: "Analytics", Icon: ChartLine },
  { href: "/wealth", label: "Wealth", Icon: Wallet },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="glass mx-auto flex max-w-md items-center justify-around p-2">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] transition-colors ${
                active ? "text-accent" : "text-fg-muted"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
