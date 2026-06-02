// app/(dashboard)/settings/_components/CategorySettingsDrawer.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Plus, AlertTriangle, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CategoryIcon, PH_ICON_MAP, LC_ICON_MAP } from "@/app/(dashboard)/analytics/_components/category-icon";
import { useLocale, useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Category {
  id: string;
  name: string;
  type: "expense" | "income" | "savings" | "shared";
  icon: string | null;
  color: string | null;
}

const CUTE_EMOJI_LIBRARY = {
  food: ["🍔", "🍜", "🍰", "🥤", "☕", "🍎", "🍣", "🍕", "🍩", "🥑", "🍨", "🍟", "🍻", "🍿"],
  shopping: ["🛍️", "👕", "💄", "👠", "🔌", "🏠", "📦", "📱", "💻", "💳", "🎁", "🎨", "🧸", "📚"],
  travel: ["🚗", "🚕", "✈️", "🚉", "🚲", "🛵", "⛽", "🗺️", "🏨", "🎟️", "🚢", "🏕️", "🎒", "🎢"],
  fun: ["🎮", "🎬", "🎤", "🍿", "🎧", "🧸", "🐱", "🐶", "🌴", "🏋️", "⛳", "🎲", "🎳", "🎭"],
  wealth: ["📈", "📉", "💰", "🪙", "🏦", "💎", "🧾", "💸", "💼", "🔒", "🪙", "🐖", "📊", "🎯"]
};

const PH_LIBRARY = {
  food: ["Coffee", "Hamburger", "Pizza", "BeerBottle", "Cake", "IceCream", "Cookie"],
  shopping: ["ShoppingBag", "ShoppingCart", "CreditCard", "TShirt", "Gift", "House", "Receipt"],
  travel: ["Car", "Airplane", "Train", "Bicycle", "GasPump", "MapPin", "Ticket"],
  fun: ["GameController", "FilmScript", "MusicNotes", "PawPrint", "Cat", "Dog", "Barbell"],
  wealth: ["TrendingUp", "TrendingDown", "Coins", "Bank", "PiggyBank", "Safe", "Briefcase"],
  cute: ["Sparkles", "Heart", "Smile", "User"]
};

const LC_LIBRARY = {
  food: ["Utensils", "Coffee", "Soup", "Wine", "Beef", "Cake", "Cookie"],
  shopping: ["ShoppingBag", "ShoppingCart", "CreditCard", "Shirt", "Gift", "Home", "Receipt"],
  travel: ["Car", "Plane", "Train", "Bike", "Fuel", "MapPin", "Ticket"],
  fun: ["Gamepad2", "Clapperboard", "Music", "PawPrint", "Cat", "Dog", "Dumbbell"],
  wealth: ["TrendingUp", "TrendingDown", "Coins", "Landmark", "PiggyBank", "Safe", "Briefcase"],
  cute: ["Sparkles", "Heart", "Smile", "User"]
};

const PREMIUM_COLORS = [
  "#f87171", // Soft Red
  "#fb923c", // Sunset Orange
  "#facc15", // Sunflower Yellow
  "#34d399", // Emerald Green
  "#38bdf8", // Sky Blue
  "#818cf8", // Indigo Purple
  "#f472b6", // Rose Pink
  "#c084fc", // Pastel Purple
  "#fb7185", // Coral Red
  "#2dd4bf", // Teal
  "#a7f3d0", // Soft Mint
  "#e2e8f0", // Warm Gray
];

export function CategorySettingsDrawer({ userId, onClose, onSuccess }: Props) {
  const locale = useLocale();
  const t = useT();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expense" | "income" | "savings">("expense");
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  
  // Edit Form state
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [editColor, setEditColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Add Mode state
  const [isAdding, setIsAdding] = useState(false);
  
  // Icon Library Tab state
  const [iconTab, setIconTab] = useState<"emoji" | "phosphor" | "lucide">("emoji");

  const supabase = useMemo(() => createClient(), []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("categories")
      .select("id, name, type, icon, color")
      .eq("user_id", userId)
      .order("name");
    setCategories((data ?? []) as Category[]);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [userId, supabase]);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === activeTab || (activeTab === "expense" && c.type === "shared"));
  }, [categories, activeTab]);

  function startEdit(cat: Category) {
    setEditingCat(cat);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditColor(cat.color);
    
    // Auto-detect which icon tab to open based on current prefix
    if (cat.icon?.startsWith("ph:")) {
      setIconTab("phosphor");
    } else if (cat.icon?.startsWith("lucide:")) {
      setIconTab("lucide");
    } else {
      setIconTab("emoji");
    }
    
    setIsAdding(false);
    setError(null);
  }

  function startAdd() {
    setEditingCat(null);
    setEditName("");
    setEditIcon("🍔");
    setEditColor(PREMIUM_COLORS[0]);
    setIconTab("emoji");
    setIsAdding(true);
    setError(null);
  }

  const isSelected = (emojiOrIcon: string) => {
    if (iconTab === "emoji") return editIcon === emojiOrIcon;
    if (iconTab === "phosphor") return editIcon === `ph:${emojiOrIcon}`;
    if (iconTab === "lucide") return editIcon === `lucide:${emojiOrIcon}`;
    return false;
  };

  const handleIconSelect = (emojiOrIcon: string) => {
    if (iconTab === "emoji") setEditIcon(emojiOrIcon);
    if (iconTab === "phosphor") setEditIcon(`ph:${emojiOrIcon}`);
    if (iconTab === "lucide") setEditIcon(`lucide:${emojiOrIcon}`);
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) {
      setError(locale === "en" ? "Name is required" : "กรุณากรอกชื่อหมวดหมู่");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isAdding) {
        // Insert new category
        const { error: insertError } = await supabase
          .from("categories")
          .insert({
            user_id: userId,
            name: editName.trim(),
            type: activeTab,
            icon: editIcon,
            color: editColor
          });
        if (insertError) throw new Error(insertError.message);
      } else if (editingCat) {
        // Update existing category
        const { error: updateError } = await supabase
          .from("categories")
          .update({
            name: editName.trim(),
            icon: editIcon,
            color: editColor
          })
          .eq("id", editingCat.id);
        if (updateError) throw new Error(updateError.message);
      }

      await fetchCategories();
      setEditingCat(null);
      setIsAdding(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(catId: string) {
    if (!window.confirm(locale === "en" ? "Are you sure you want to delete this category?" : "คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่นี้?")) return;
    
    setSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("id", catId);
      
      if (deleteError) throw new Error(deleteError.message);

      await fetchCategories();
      setEditingCat(null);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting category");
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || loading;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => { if (!busy) onClose(); }}
      />
      <motion.div
        key="drawer"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 flex flex-col max-h-[85vh]"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="mb-1 flex justify-center shrink-0">
          <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
        </div>
        
        {/* Header */}
        <div className="mb-4 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">
            {locale === "en" ? "Manage Categories" : "จัดการหมวดหมู่การเงิน"}
          </h2>
          <button onClick={() => { if (!busy) onClose(); }} disabled={busy}>
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        {/* Tab Selection */}
        {!editingCat && !isAdding && (
          <div className="mb-4 flex gap-1 rounded-xl border border-[var(--glass-border)] p-1 shrink-0">
            {(["expense", "income", "savings"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="flex-1 rounded-lg py-2 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: activeTab === tab ? "var(--accent)" : "transparent",
                  color: activeTab === tab ? "black" : "var(--fg-muted)",
                }}
              >
                {tab === "expense" ? t.common.expense : tab === "income" ? t.common.income : t.common.savings}
              </button>
            ))}
          </div>
        )}

        {/* Main content scrollable container */}
        <div className="overflow-y-auto pr-1 flex-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {editingCat || isAdding ? (
            // Category Editor Form
            <form onSubmit={handleSave} className="space-y-4 pb-4">
              <div className="flex items-center gap-3">
                {/* Category Preview Icon */}
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-inner border border-white/5"
                  style={{ backgroundColor: `${editColor || "#4b5563"}25`, color: editColor || "#fff" }}
                >
                  <CategoryIcon name={editName} emoji={editIcon} size={20} style={{ color: editColor ?? undefined }} />
                </span>
                
                {/* Name Input */}
                <div className="flex-1">
                  <label className="block text-xxs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                    {locale === "en" ? "Category Name" : "ชื่อหมวดหมู่"}
                  </label>
                  <input
                    type="text"
                    placeholder={locale === "en" ? "e.g. Daily Coffee" : "เช่น กาแฟแก้วโปรด"}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              {/* Curated Color Grid */}
              <div className="space-y-1.5">
                <label className="block text-xxs font-semibold text-fg-muted uppercase tracking-wider">
                  {locale === "en" ? "Select Color" : "เลือกโทนสีประจำหมวด"}
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PREMIUM_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className="h-10 w-full rounded-xl border border-black/20 flex items-center justify-center transition-transform active:scale-95"
                      style={{ backgroundColor: c }}
                    >
                      {editColor === c && <Check size={16} className="text-black animate-scale-up" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Curated Cute Icons Library (Tabbed Selector) */}
              <div className="space-y-2">
                <label className="block text-xxs font-semibold text-fg-muted uppercase tracking-wider">
                  {locale === "en" ? "Select Cute Icon" : "เลือกไอคอนสุดน่ารัก"}
                </label>
                
                {/* Icon Library Selector Tabs */}
                <div className="flex gap-1 rounded-xl bg-black/10 p-1 shrink-0">
                  {(["emoji", "phosphor", "lucide"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setIconTab(tab)}
                      className={`flex-1 rounded-lg py-1.5 text-xxs font-semibold transition-all uppercase tracking-wider ${
                        iconTab === tab
                          ? "bg-[var(--glass-bg)] border border-[var(--glass-border)] text-accent font-bold"
                          : "text-fg-muted hover:text-fg"
                      }`}
                    >
                      {tab === "emoji" ? "Emojis 🧸" : tab === "phosphor" ? "Phosphor 💎" : "Lucide ⚡"}
                    </button>
                  ))}
                </div>
                
                <div className="space-y-3 bg-black/10 rounded-2xl p-3 max-h-48 overflow-y-auto">
                  {iconTab === "emoji" &&
                    Object.entries(CUTE_EMOJI_LIBRARY).map(([group, emojis]) => (
                      <div key={group} className="space-y-1">
                        <p className="text-[10px] text-fg-muted font-bold uppercase tracking-wider">
                          {group === "food" ? "🍔 Food & Café" :
                           group === "shopping" ? "🛒 Shop & Bills" :
                           group === "travel" ? "🚗 Travel & Car" :
                           group === "fun" ? "🐈 Pet & Leisure" : "📈 Invest & Wealth"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleIconSelect(emoji)}
                              className={`h-9 w-9 text-lg rounded-lg flex items-center justify-center transition-all ${
                                isSelected(emoji)
                                  ? "bg-accent border border-accent/40 scale-110 text-black"
                                  : "hover:bg-white/5 active:scale-95"
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  }

                  {iconTab === "phosphor" &&
                    Object.entries(PH_LIBRARY).map(([group, icons]) => (
                      <div key={group} className="space-y-1">
                        <p className="text-[10px] text-fg-muted font-bold uppercase tracking-wider">
                          {group === "food" ? "🍟 Food & Café" :
                           group === "shopping" ? "🛍️ Shop & Bills" :
                           group === "travel" ? "✈️ Travel & Car" :
                           group === "fun" ? "🎮 Pet & Leisure" :
                           group === "wealth" ? "💰 Invest & Wealth" : "✨ General"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {icons.map((ic) => {
                            const PhIcon = PH_ICON_MAP[ic];
                            if (!PhIcon) return null;
                            return (
                              <button
                                key={ic}
                                type="button"
                                onClick={() => handleIconSelect(ic)}
                                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${
                                  isSelected(ic)
                                    ? "bg-accent border border-accent/40 scale-110 text-black"
                                    : "hover:bg-white/5 text-fg-muted hover:text-fg active:scale-95"
                                }`}
                              >
                                <PhIcon size={18} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  }

                  {iconTab === "lucide" &&
                    Object.entries(LC_LIBRARY).map(([group, icons]) => (
                      <div key={group} className="space-y-1">
                        <p className="text-[10px] text-fg-muted font-bold uppercase tracking-wider">
                          {group === "food" ? "🍟 Food & Café" :
                           group === "shopping" ? "🛍️ Shop & Bills" :
                           group === "travel" ? "✈️ Travel & Car" :
                           group === "fun" ? "🎮 Pet & Leisure" :
                           group === "wealth" ? "💰 Invest & Wealth" : "✨ General"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {icons.map((ic) => {
                            const LcIcon = LC_ICON_MAP[ic];
                            if (!LcIcon) return null;
                            return (
                              <button
                                key={ic}
                                type="button"
                                onClick={() => handleIconSelect(ic)}
                                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${
                                  isSelected(ic)
                                    ? "bg-accent border border-accent/40 scale-110 text-black"
                                    : "hover:bg-white/5 text-fg-muted hover:text-fg active:scale-95"
                                }`}
                              >
                                <LcIcon size={18} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {error && (
                <div className="flex gap-2 rounded-xl bg-[var(--negative)]/10 p-3 text-xs text-[var(--negative)]">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingCat(null); setIsAdding(false); }}
                  className="flex-1 rounded-xl border border-[var(--glass-border)] py-2.5 text-sm font-semibold transition-colors hover:bg-white/5"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-black disabled:opacity-40 transition-transform active:scale-98"
                >
                  {saving ? t.common.loading : t.common.save}
                </button>
              </div>

              {editingCat && (
                <button
                  type="button"
                  onClick={() => handleDelete(editingCat.id)}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--negative)]/40 py-2.5 text-xs font-semibold text-[var(--negative)] disabled:opacity-40 transition-colors hover:bg-[var(--negative)]/10"
                >
                  <Trash2 size={14} />
                  {locale === "en" ? "Delete Category" : "ลบหมวดหมู่นี้"}
                </button>
              )}
            </form>
          ) : (
            // Categories List view
            <div className="space-y-4 pb-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-fg-muted">
                  {locale === "en" ? `You have ${filteredCategories.length} custom categories` : `คุณมีหมวดหมู่กำหนดเองทั้งหมด ${filteredCategories.length} รายการ`}
                </p>
                <button
                  onClick={startAdd}
                  className="flex items-center gap-1 text-xs font-semibold text-accent"
                >
                  <Plus size={14} /> {locale === "en" ? "Add Category" : "เพิ่มหมวดหมู่ใหม่"}
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-fg-muted text-center py-6">{t.common.loading}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredCategories.map((cat, idx) => {
                    const fallbackColor = PREMIUM_COLORS[idx % PREMIUM_COLORS.length];
                    const activeColor = cat.color || fallbackColor;
                    
                    return (
                      <button
                        key={cat.id}
                        onClick={() => startEdit(cat)}
                        className="flex items-center gap-2.5 p-3 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-left hover:scale-[1.01] transition-transform"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base shadow-sm"
                          style={{ backgroundColor: `${activeColor}20`, color: activeColor }}
                        >
                          <CategoryIcon name={cat.name} emoji={cat.icon} size={14} style={{ color: activeColor }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-tight">{cat.name}</p>
                          <p className="text-[10px] text-fg-muted capitalize mt-0.5">{cat.type === "shared" ? "shared" : cat.type}</p>
                        </div>
                        <Edit2 size={12} className="text-fg-muted opacity-40 hover:opacity-100 shrink-0" />
                      </button>
                    );
                  })}
                  {filteredCategories.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-xs text-fg-muted">
                      {locale === "en" ? "No custom categories found" : "ยังไม่มีหมวดหมู่กำหนดเอง"}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

