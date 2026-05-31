// app/(dashboard)/settings/_components/WalletSection.tsx
"use client";

import { useState } from "react";
import { SettingsRow } from "./SettingsRow";
import { WalletSettingsDrawer } from "./WalletSettingsDrawer";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  userId: string;
}

export function WalletSection({ userId }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingsRow
        icon="👛"
        label={t.settings.wallets}
        onClick={() => setOpen(true)}
      />
      <WalletSettingsDrawer
        userId={userId}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
