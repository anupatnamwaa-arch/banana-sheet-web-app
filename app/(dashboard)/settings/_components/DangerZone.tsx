"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";
import { deleteAllUserData } from "@/app/actions/profile";
import { useRouter } from "next/navigation";

export function DangerZone() {
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
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setDeleting(false);
    }
  }

  return (
    <>
      <SettingsSection title="โซนอันตราย">
        <SettingsRow
          icon="🗑️"
          label="ล้างข้อมูลทั้งหมด"
          sublabel="ลบรายการ สินทรัพย์ หนี้สิน และเป้าหมายทั้งหมด"
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
              <p className="mt-3 text-base font-semibold">ล้างข้อมูลทั้งหมด?</p>
              <p className="mt-1 text-sm text-fg-muted">
                รายการ สินทรัพย์ หนี้สิน เป้าหมาย และประวัติทั้งหมดจะถูกลบถาวร
                ไม่สามารถกู้คืนได้
              </p>
              {error && <p className="mt-2 text-xs text-negative">{error}</p>}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setConfirm(false)}
                  disabled={deleting}
                  className="flex-1 rounded-2xl border border-[var(--glass-border)] py-2.5 text-sm font-medium text-fg-muted disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-2xl bg-negative py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {deleting ? "กำลังลบ…" : "ลบทั้งหมด"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
