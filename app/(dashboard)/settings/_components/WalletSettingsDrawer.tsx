// app/(dashboard)/settings/_components/WalletSettingsDrawer.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Edit2, AlertTriangle, Loader2, Check } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/LanguageProvider";
import { getWallets, setWallet, deleteWallet } from "@/app/actions/wallets";
import type { Wallet } from "@/lib/types";
import { formatTHB } from "@/lib/format";

interface Props {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const WALLET_COLORS = [
  "#4ade80", // Green
  "#38bdf8", // Blue
  "#fb923c", // Orange
  "#facc15", // Yellow
  "#f472b6", // Pink
  "#a78bfa", // Purple
  "#f87171", // Red
  "#94a3b8", // Gray
];

const WALLET_ICONS = ["👛", "💵", "🏦", "💳", "💰", "🐖", "🪙", "💳"];

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none focus:border-accent";

export function WalletSettingsDrawer({ userId, isOpen, onClose }: Props) {
  const t = useT();
  const locale = useLocale();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState(WALLET_COLORS[0]);
  const [icon, setIcon] = useState(WALLET_ICONS[0]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load wallets on open or save
  const loadWallets = async () => {
    setLoading(true);
    try {
      const data = await getWallets();
      setWallets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWallets();
      resetForm();
    }
  }, [isOpen]);

  function resetForm() {
    setName("");
    setBalance("");
    setColor(WALLET_COLORS[0]);
    setIcon(WALLET_ICONS[0]);
    setEditingWallet(null);
    setShowForm(false);
    setError(null);
  }

  function handleEditWallet(wallet: Wallet) {
    setEditingWallet(wallet);
    setName(wallet.name);
    setBalance(String(wallet.balance));
    setColor(wallet.color);
    setIcon(wallet.icon);
    setShowForm(true);
    setError(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError(locale === "en" ? "Wallet name is required" : "กรุณากรอกชื่อกระเป๋าเงิน");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setWallet({
        id: editingWallet?.id,
        name: name.trim(),
        balance: parseFloat(balance) || 0,
        color,
        icon,
      });
      await loadWallets();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error saving wallet");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingWallet) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteWallet(editingWallet.id);
      await loadWallets();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error deleting wallet");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!saving && !deleting) onClose();
            }}
          />

          {/* Slide up Drawer */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Slide handle */}
            <div className="mb-3 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
            </div>

            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {showForm
                  ? editingWallet
                    ? locale === "en"
                      ? "Edit Wallet"
                      : "แก้ไขบัญชี/กระเป๋าเงิน"
                    : locale === "en"
                    ? "Add Wallet"
                    : "เพิ่มบัญชี/กระเป๋าเงิน"
                  : locale === "en"
                  ? "Accounts & Wallets"
                  : "บัญชีและกระเป๋าเงิน"}
              </h2>
              <button
                onClick={() => {
                  if (showForm) {
                    resetForm();
                  } else {
                    onClose();
                  }
                }}
                disabled={saving || deleting}
                className="text-fg-muted hover:text-fg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* ERROR ALERTS */}
            {error && (
              <div className="mb-4 flex gap-2 rounded-xl bg-negative/10 p-3 text-xs text-negative">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STAGE 1: Wallets list */}
            {!showForm && (
              <div className="space-y-4">
                <p className="text-xs text-fg-muted">
                  {locale === "en"
                    ? "Manage your active wallets and bank accounts below."
                    : "จัดการและบันทึกกระเป๋าเงินหรือบัญชีธนาคารต่าง ๆ ของคุณ"}
                </p>

                {loading ? (
                  <div className="py-8 text-center text-sm text-fg-muted flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>{t.common.loading}</span>
                  </div>
                ) : wallets.length === 0 ? (
                  <div className="py-8 text-center text-sm text-fg-muted">
                    {locale === "en" ? "No wallets found." : "ยังไม่มีกระเป๋าเงินใด ๆ"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {wallets.map((wallet) => (
                      <div
                        key={wallet.id}
                        className="flex items-center gap-3 rounded-2xl bg-[var(--bg)] border border-[var(--glass-border)]/50 p-4 shadow-sm"
                      >
                        {/* Emoji icon inside color background */}
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-inner"
                          style={{ backgroundColor: `${wallet.color}25` }}
                        >
                          {wallet.icon}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-fg">{wallet.name}</p>
                          <p className="font-mono text-xs text-fg-muted mt-0.5">
                            {formatTHB(wallet.balance)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleEditWallet(wallet)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--glass-bg)] active:scale-95 transition-all text-accent border border-[var(--glass-border)]/20"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add button */}
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-semibold text-black hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Plus size={16} />
                  {locale === "en" ? "Add Wallet" : "เพิ่มกระเป๋าเงิน / บัญชี"}
                </button>
              </div>
            )}

            {/* STAGE 2: Add / Edit Form */}
            {showForm && (
              <div className="space-y-4">
                {/* Wallet Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted uppercase">
                    {locale === "en" ? "Wallet Name" : "ชื่อกระเป๋าเงิน / บัญชี"}
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    placeholder={
                      locale === "en"
                        ? "e.g. Cash, Savings, Credit Card"
                        : "เช่น เงินสด, ออมทรัพย์, บัตรหลัก"
                    }
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Balance */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted uppercase">
                    {locale === "en" ? "Current Balance" : "ยอดเงินคงเหลือปัจจุบัน"}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="฿0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Color Selector */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-fg-muted uppercase">
                    {locale === "en" ? "Color Theme" : "ธีมสี"}
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {WALLET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setColor(col)}
                        className="relative h-8 w-8 rounded-full border border-black/10 shadow-sm cursor-pointer active:scale-90 transition-all flex items-center justify-center shrink-0"
                        style={{ backgroundColor: col }}
                      >
                        {color === col && <Check size={14} className="text-black font-extrabold" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Selector */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-fg-muted uppercase">
                    {locale === "en" ? "Icon / Emoji" : "ไอคอน / อีโมจิ"}
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {WALLET_ICONS.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg border cursor-pointer active:scale-90 transition-all ${
                          icon === emoji
                            ? "border-accent bg-accent/10"
                            : "border-[var(--glass-border)] bg-[var(--bg)] hover:bg-[var(--glass-bg)]"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || deleting}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-semibold text-black hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer shadow-md"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? t.common.loading : locale === "en" ? "Save Wallet" : "บันทึกข้อมูล"}
                  </button>

                  {/* Delete button (Edit mode only) */}
                  {editingWallet && (
                    <div className="border-t border-[var(--glass-border)]/50 pt-4 mt-2 space-y-2">
                      <p className="text-[10px] text-fg-muted leading-relaxed text-center flex items-center gap-1 justify-center">
                        <AlertTriangle size={12} className="text-accent" />
                        {locale === "en"
                          ? "Deleting a wallet will unassign its transactions."
                          : "การลบกระเป๋าเงินจะยกเลิกการผูกยอดกับธุรกรรมที่เกี่ยวข้อง"}
                      </p>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={saving || deleting}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-negative/30 bg-negative/5 py-3 text-sm font-semibold text-negative hover:bg-negative/10 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {deleting && <Loader2 size={16} className="animate-spin" />}
                        {deleting ? locale === "en" ? "Deleting..." : "กำลังลบ..." : locale === "en" ? "Delete Wallet" : "ลบกระเป๋าเงิน"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
