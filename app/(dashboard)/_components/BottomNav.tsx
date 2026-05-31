"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ChartLine, Plus, CreditCard, Wallet } from "lucide-react";
import { UniversalFabDrawer } from "./UniversalFabDrawer";
import { useT } from "@/lib/i18n/LanguageProvider";

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const leftTabs = [
    { href: "/overview", label: t.nav.home, Icon: House },
    { href: "/analytics", label: t.nav.analytics, Icon: ChartLine },
  ];
  const rightTabs = [
    { href: "/transactions", label: t.nav.transactions, Icon: CreditCard },
    { href: "/wealth", label: t.nav.wealth, Icon: Wallet },
  ];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [categoriesFetched, setCategoriesFetched] = useState(false);

  async function handleFabClick() {
    if (!categoriesFetched) {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) setCategories(await res.json());
      } catch {
        // proceed with empty categories — still usable
      }
      setCategoriesFetched(true);
    }
    setDrawerOpen(true);
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="relative mx-auto flex max-w-md items-end">
          {/* Nav bar */}
          <div className="glass flex w-full items-center justify-around p-2">
            {leftTabs.map(({ href, label, Icon }) => {
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

            {/* FAB spacer */}
            <div className="w-[52px] flex-shrink-0" aria-hidden />

            {rightTabs.map(({ href, label, Icon }) => {
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

          {/* Notched FAB — protrudes 20px above nav */}
          <button
            onClick={handleFabClick}
            aria-label={t.nav.addEntry}
            style={{ bottom: "calc(100% - 20px)" }}
            className="absolute left-1/2 -translate-x-1/2 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-black shadow-[0_6px_24px_rgba(250,204,21,0.45)] transition-transform active:scale-95"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <UniversalFabDrawer
          categories={categories}
          onClose={() => setDrawerOpen(false)}
          onSuccess={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
