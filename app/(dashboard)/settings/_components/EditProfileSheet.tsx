"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateProfileDisplay } from "@/app/actions/profile";

interface Props {
  userId: string;
  currentName: string;
  currentAvatarUrl: string | null;
  onClose: () => void;
  onSaved: (name: string, avatarUrl: string | null) => void;
}

export function EditProfileSheet({
  userId,
  currentName,
  currentAvatarUrl,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState(currentName);
  const [avatarUrl] = useState<string | null>(currentAvatarUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("ไฟล์ภาพต้องไม่เกิน 5 MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let finalUrl = avatarUrl;

      // Upload new image if one was selected
      if (file) {
        const supabase = createClient();
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/avatar.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (uploadErr) throw new Error(uploadErr.message);

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        // Append cache-bust so the browser doesn't show the old image
        finalUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      await updateProfileDisplay(name.trim() || null, finalUrl);
      onSaved(name.trim() || currentName, finalUrl);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  const displaySrc = preview ?? avatarUrl;
  const initial = (name || currentName).charAt(0).toUpperCase();

  const inputClass =
    "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => { if (!saving) onClose(); }}
      />
      <motion.div
        key="sheet"
        className="fixed inset-x-0 bottom-0 z-50 space-y-5 rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="flex justify-center">
          <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">แก้ไขโปรไฟล์</h2>
          <button onClick={() => { if (!saving) onClose(); }} disabled={saving}>
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        {/* Avatar picker */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative"
            disabled={saving}
          >
            <div className="h-24 w-24 overflow-hidden rounded-full">
              {displaySrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displaySrc}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent text-3xl font-bold text-black">
                  {initial}
                </div>
              )}
            </div>
            {/* Camera overlay */}
            <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--bg-elevated)] bg-[var(--bg-elevated)] shadow">
              <Camera size={14} className="text-fg" />
            </div>
          </button>
          <p className="text-xs text-fg-muted">แตะเพื่อเปลี่ยนรูปโปรไฟล์</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Nickname */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">
            ชื่อเล่น / ชื่อที่ใช้แสดง
          </label>
          <input
            type="text"
            placeholder="เช่น กล้วย, มิ้ง, อาย..."
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-right text-xs text-fg-muted">{name.length}/40</p>
        </div>

        {error && (
          <div className="flex gap-2 rounded-xl bg-negative/10 p-3 text-sm text-negative">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-40"
        >
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
