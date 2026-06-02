// app/(dashboard)/settings/_components/FixedCostSection.tsx
"use client";

import { useState, useEffect } from "react";
import { SettingsRow } from "./SettingsRow";
import { FixedCostSettingsDrawer } from "./FixedCostSettingsDrawer";
import { useT } from "@/lib/i18n/LanguageProvider";
import { getFixedCosts } from "@/app/actions/fixed-costs";

interface Props {
  userId: string;
}

export function FixedCostSection({ userId }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  // Fetch count of active fixed costs
  useEffect(() => {
    getFixedCosts(userId)
      .then((data) => {
        setCount(data.length);
      })
      .catch(console.error);
  }, [userId, open]);

  return (
    <>
      <SettingsRow
        icon="🔄"
        label={t.fixedCosts.title}
        sublabel={count !== null ? `${count} items` : undefined}
        onClick={() => setOpen(true)}
      />
      <FixedCostSettingsDrawer
        userId={userId}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
