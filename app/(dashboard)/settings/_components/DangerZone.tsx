"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";
import { deleteAllUserData } from "@/app/actions/profile";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/LanguageProvider";

export function DangerZone() {
  const t = useT();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAllUserData();
      setConfirm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.settings.clearError);
      setDeleting(false);
    }
  }

  return (
    <>
      <SettingsSection title={t.settings.sectionDanger}>
        <SettingsRow
          icon="🗑️"
          label={t.settings.clearAllData}
          sublabel={t.settings.clearAllDataSub}
          danger
          onClick={() => setConfirm(true)}
        />
      </SettingsSection>

      <AnimatePresence>
        {confirm && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!deleting) setConfirm(false); }}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[var(--bg-elevated)] p-5 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <p className="text-3xl">⚠️</p>
              <p className="mt-3 text-base font-semibold">{t.settings.clearConfirmTitle}</p>
              <p className="mt-1 text-sm text-fg-muted">
                {t.settings.clearConfirmDesc}
              </p>
              {error && <p className="mt-2 text-xs text-negative">{error}</p>}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setConfirm(false)}
                  disabled={deleting}
                  className="flex-1 rounded-2xl border border-[var(--glass-border)] py-2.5 text-sm font-medium text-fg-muted disabled:opacity-50"
                >
                  {t.settings.clearCancel}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-2xl bg-negative py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {deleting ? t.settings.clearDeleting : t.settings.clearConfirmBtn}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
