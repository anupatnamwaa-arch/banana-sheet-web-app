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
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string; icon: string | null }>>([]);
  const [categoriesFetched, setCategoriesFetched] = useState(false);

  async function handleFabClick() {
    if (!categoriesFetched) {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) setCategories(await res.json());
      } catch {
        // proceed with empty categories - still usable
      }
      setCategoriesFetched(true);
    }
    setDrawerOpen(true);
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="relative mx-auto flex max-w-md items-end">
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

            {/* Protruding FAB */}
            <div className="relative flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center">
              <button
                onClick={handleFabClick}
                aria-label={t.nav.addEntry}
                id="fab-add-button"
                className="absolute -top-5 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-accent text-black shadow-[0_6px_20px_var(--color-accent-shadow)] transition-all hover:scale-105 active:scale-95 duration-200 z-10 group"
              >
                <Plus size={26} className="transition-transform group-hover:rotate-90 duration-200" strokeWidth={2.5} />
              </button>
            </div>

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
